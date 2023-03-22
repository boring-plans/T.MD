import { Node } from "prosemirror-model"
import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"

const MAX_MATCH = 500

/**
 * Hide ` when stepping out.
 * @param view
 * @param prevState
 */
function stepOut (view: EditorView, prevState: EditorState) {
  const inlineCodeMark = view.state.schema.marks.code
  const currFrom = view.state.selection.from,
    currTo = view.state.selection.to
  const prevFrom = prevState.selection.from,
    prevTo = prevState.selection.to

  const currNodesPosList: [number, Node][] = []
  let currStart, currStop
  let prevStart, prevStop

  if (currTo > currFrom) {
    currStart = currFrom
    currStop = currTo
  } else {
    currStart = currFrom - 1
    currStop = currTo + 1
  }

  view.state.doc.nodesBetween(currStart, currStop, (node, pos) => {
    node.isText && currNodesPosList.push([pos, node])
  })

  if (prevTo > prevFrom) {
    prevStart = prevFrom
    prevStop = prevTo
  } else {
    prevStart = prevFrom - 1
    prevStop = prevTo + 1
  }

  // Since both position and node content may have changed,
  // we need to compare both.
  prevState.doc.nodesBetween(prevStart, prevStop, (node, pos) => {
    if (
      node.isText &&
      inlineCodeMark.isInSet(node.marks) &&
      !currNodesPosList.some(([p, n]) => p === pos || n.eq(node))
    ) {
      const match = node.textContent.match(/`.+?`/)

      if (match) {
        const tr = view.state.tr

        // content may have changed already
        if (tr.doc.content.size >= pos + node.nodeSize) {
          tr.replaceWith(
            pos,
            pos + node.nodeSize,
            view.state.schema.text(node.textContent.slice(1, -1), [
              inlineCodeMark.create(),
            ])
          )
        }

        view.dispatch(tr)
      }
    }
  })
}

/**
 * Show ` when stepping in
 * @param view
 */
function stepIn (view: EditorView) {
  const from = view.state.selection.from,
    to = view.state.selection.to
  const inlineCodeMark = view.state.schema.marks.code

  let start, stop
  if (to > from) {
    start = from
    stop = to
  } else {
    start = from - 1
    stop = to + 1
  }

  view.state.doc.nodesBetween(start, stop, (node, pos) => {
    if (node.isText && inlineCodeMark.isInSet(node.marks)) {
      const match = node.textContent.match(/^`.*?`$/)

      if (!match) {
        const tr = view.state.tr
        const mark = inlineCodeMark.create()

        const nodeEnd = pos + node.nodeSize
        if (tr.doc.content.size >= nodeEnd) {
          // When some content has been selected,
          // we directly add a ` pair
          if (to !== from) {
            // tr.insertText('`', from + 1).insertText('`', nodeEnd + 1)
            tr.replaceWith(
              pos,
              nodeEnd,
              view.state.schema.text(`\`${node.textContent}\``, [mark])
            )
          } else {
            // But if directly clicking on the node with inline code mark,
            // we hope cursor is located to the right spot after adding ` pair.
            tr.replaceWith(
              to,
              nodeEnd,
              view.state.schema.text(
                `${node.textContent.slice(to - pos, nodeEnd - pos)}\``,
                [mark]
              )
            ).replaceWith(
              pos,
              from,
              view.state.schema.text(
                `\`${node.textContent.slice(0, from - pos)}`,
                [mark]
              )
            )
          }

          view.dispatch(tr)
        }
      } else if (node.textContent === "``") {
        // Node content changes into ``.
        const tr = view.state.tr
        tr.removeMark(pos, pos + 2, inlineCodeMark)
        view.dispatch(tr)
      }
    }
  })
}

// when typing in before or after the letter '`',
// step out the inline code mark text node
function run (view: EditorView, from: number, to: number) {
  if (!view.composing) {
    // after `
    const textBefore = view.state.doc.textBetween(
      Math.max(0, view.state.doc.resolve(from).parentOffset - MAX_MATCH),
      from
    )

    const matchBefore = textBefore.match(/`.+?`$/)
    if (matchBefore) {
      const tr = view.state.tr
      tr.removeStoredMark(view.state.schema.marks.code)
      view.dispatch(tr)
    }

    // before `
    const textAfter = view.state.doc.textBetween(
      to,
      Math.min(view.state.doc.resolve(to).end(), to + MAX_MATCH)
    )
    const matchAfter = textAfter.match(/^`.+?`/)
    if (matchAfter) {
      const tr = view.state.tr
      tr.removeStoredMark(view.state.schema.marks.code)
      view.dispatch(tr)
    }
  }

  return false
}

export function buildInlineCodeToggleOrigin (): Plugin {
  const plugin = new Plugin({
    view () {
      return {
        update (view, prevState) {
          stepOut(view, prevState)
          stepIn(view)
        },
      }
    },
    props: {
      handleTextInput (view, from, to) {
        return run(view, from, to)
      },
      // handleDOMEvents()
    },
  })
  return plugin
}
