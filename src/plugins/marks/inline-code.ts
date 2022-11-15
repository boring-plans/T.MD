import { Node } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

const MAX_MATCH = 500;

function stepOut(view: EditorView, prevState: EditorState) {
  const inlineCodeMark = view.state.schema.marks.code;
  const currFrom = view.state.selection.from,
    currTo = view.state.selection.to;
  const prevFrom = prevState.selection.from,
    prevTo = prevState.selection.to;

  const tr = view.state.tr;
  const currNodes: (Node | null)[] = [];
  let currStart, currStop;
  let prevStart, prevStop;

  if (currTo > currFrom) {
    currStart = currFrom;
    currStop = currTo;
  } else {
    currStart = currFrom - 1;
    currStop = currTo + 1;
  }

  view.state.doc.nodesBetween(currStart, currStop, (node) => {
    currNodes.push(node);
  });

  if (prevTo > prevFrom) {
    prevStart = prevFrom;
    prevStop = prevTo;
  } else {
    prevStart = prevFrom - 1;
    prevStop = prevTo + 1;
  }

  prevState.doc.nodesBetween(prevStart, prevStop, (node, pos) => {
    if (inlineCodeMark.isInSet(node.marks) && !currNodes.includes(node)) {
      const match = node.textContent.match(/`.+?`/);

      if (match) {
        tr.delete(pos + node.nodeSize - 1, pos + node.nodeSize).delete(
          pos,
          pos + 1
        );
        view.dispatch(tr);
      }
    }
  });
}

// when typing in before or after the letter '`',
// step out the inline code mark text node
function run(view: EditorView, from: number, to: number) {
  if (!view.composing) {
    // after `
    const textBefore = view.state.doc.textBetween(
      Math.max(0, view.state.doc.resolve(from).parentOffset - MAX_MATCH),
      from
    );

    const matchBefore = textBefore.match(/`.+?`$/);
    if (matchBefore) {
      const tr = view.state.tr;
      tr.removeStoredMark(view.state.schema.marks.code);
      view.dispatch(tr);
    }

    // before `
    const textAfter = view.state.doc.textBetween(
      to,
      Math.min(view.state.doc.resolve(to).end(), to + MAX_MATCH)
    );
    const matchAfter = textAfter.match(/^`.+?`/);
    if (matchAfter) {
      const tr = view.state.tr;
      tr.removeStoredMark(view.state.schema.marks.code);
      view.dispatch(tr);
    }
  }

  return false;
}

export function buildInlineCodeToggleOrigin(): Plugin {
  const plugin = new Plugin({
    view() {
      return {
        update(view, prevState) {
          stepOut(view, prevState);
        },
      };
    },
    props: {
      handleTextInput(view, from, to) {
        return run(view, from, to);
      },
    },
  });
  return plugin;
}
