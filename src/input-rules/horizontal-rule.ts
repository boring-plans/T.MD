import { InputRule } from "prosemirror-inputrules";
import { NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

/**
 * Add a horizontal line when typing in '---' or '___' or '***' in one new line.
 * What's more, when the new line is the bottom of whole document,
 * or next line is horizontal line already, add one new line.
 */
export function horizontalRuleRule(nodeType: NodeType) {
  return new InputRule(
    /^(-{3}|\*{3})$/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match[1]) {
        const tr = state.tr;
        const $start = tr.doc.resolve(from);

        if (
          $start.after() === $start.end(-1) ||
          $start.doc.resolve($start.after()).nodeAfter?.type === nodeType
        ) {
          tr.insert($start.after(), state.schema.nodes.paragraph.create());
        }

        return tr.delete(from, to).insert(from, nodeType.create());
      }

      return null;
    }
  );
}
