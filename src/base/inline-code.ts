import { InputRule } from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";

const INLINE_CODE_PATTERN = /`(.+?)`/;

function hasMarked(pos: number, state: EditorState) {
  return state.schema.marks.code.isInSet(state.doc.resolve(pos).marks());
}

/**
 *
 * @returns
 */
export function inlineCodeBefore() {
  return new InputRule(
    /`(.+?)`$/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match && !hasMarked(from, state)) {
        const tr = state.tr;
        tr.insertText("`", to).addMark(
          from + 1,
          to,
          state.schema.marks.code.create()
        );

        tr.removeStoredMark(state.schema.marks.code);

        return tr;
      }

      return null;
    }
  );
}

/**
 *
 * @returns
 */
export function inlineCodeAfter() {
  return new InputRule(
    /(`$)/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match) {
        const tr = state.tr;
        const textAfter =
          "`" + tr.doc.textBetween(from, tr.doc.resolve(from).end());
        const matchResult = textAfter.match(INLINE_CODE_PATTERN);
        if (matchResult) {
          tr.insertText("`").addMark(
            from + 1,
            to + matchResult[1].length + 1,
            state.schema.marks.code.create()
          );
          return tr;
        }
      }

      return null;
    }
  );
}

/**
 *
 * @returns
 */
export function inlineCodeBetween() {
  return new InputRule(
    /`([^`]+)/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match && !hasMarked(to, state)) {
        const tr = state.tr;
        const textEntire =
          tr.doc.textBetween(from, to) +
          match[1].slice(-1) +
          tr.doc.textBetween(to, tr.doc.resolve(from).end());
        const matchResult = textEntire.match(INLINE_CODE_PATTERN);

        if (matchResult) {
          tr.insertText(match[1].slice(-1)).addMark(
            from - match[1].length + 2,
            to + matchResult[0].length - match[1].length - 1,
            state.schema.marks.code.create()
          );
          return tr;
        }
      }

      return null;
    }
  );
}

export function inlineCodeRule() {
  return [inlineCodeBefore(), inlineCodeAfter(), inlineCodeBetween()];
}
