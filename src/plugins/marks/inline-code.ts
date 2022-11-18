import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

function run(view: EditorView, from: number, to: number) {
  const inlineCodeMark = view.state.schema.marks.code;

  // When typing at the end of node with inline code mark,
  // and this node is the last element of paragraph,
  // step out
  view.state.doc.nodesBetween(from < to ? from : from - 1, to, (node) => {
    const paragraphEnd = view.state.doc.resolve(from).end();

    if (
      node.isText &&
      inlineCodeMark.isInSet(node.marks) &&
      paragraphEnd === to
    ) {
      const tr = view.state.tr;
      tr.removeStoredMark(inlineCodeMark);
      view.dispatch(tr);
    }
  });

  return false;
}

export function buildInlineCodeStepOut(): Plugin {
  const plugin = new Plugin({
    props: {
      handleTextInput(view, from, to) {
        return run(view, from, to);
      },
    },
  });
  return plugin;
}
