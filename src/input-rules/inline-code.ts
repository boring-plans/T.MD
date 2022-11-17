import { InputRule } from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";

const MAX_MATCH = 500;

function hasMarked(from: number, to: number, state: EditorState) {
  const insideCodeMark = state.schema.marks.code;
  let hasMarked = true;
  if (to > from) {
    state.doc.nodesBetween(from, to, (node) => {
      if (node.isText && !insideCodeMark.isInSet(node.marks)) {
        hasMarked = false;
      }
    });
  } else {
    hasMarked = !!insideCodeMark.isInSet(state.doc.resolve(from).marks());
  }
  return hasMarked;
}

/**
 * '`' after '`sth'
 */
export function inlineCodeBefore() {
  return new InputRule(
    /`(.+?)`$/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match && !hasMarked(from, to, state)) {
        const tr = state.tr;
        tr.replaceWith(
          from,
          to,
          state.schema.text(`\`${match[1]}\``, [
            state.schema.marks.code.create(),
          ])
        );
        return tr;
      }
      return null;
    }
  );
}

/**
 * '`' before 'sth`'
 */
export function inlineCodeAfter() {
  return new InputRule(
    /(`$)/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match) {
        const tr = state.tr;
        const $from = tr.doc.resolve(from);

        const textAfter =
          "`" +
          tr.doc.textBetween(
            from,
            Math.min($from.end(), MAX_MATCH + $from.parentOffset)
          );
        const matchResult = textAfter.match(/`(.+?)`/);

        if (
          matchResult &&
          !hasMarked(from, from + matchResult[1].length + 1, state)
        ) {
          const inlineCodeMark = state.schema.marks.code.create();
          tr.replaceWith(
            from,
            to + matchResult[1].length + 1,
            state.schema.text(`${matchResult[1]}\``, [inlineCodeMark])
          ).replaceWith(from, from, state.schema.text("`", [inlineCodeMark]));
          return tr;
        }
      }

      return null;
    }
  );
}

/**
 * insert sth into '``'
 */
export function inlineCodeBetween() {
  return new InputRule(
    /`([^`]+)/,
    (state: EditorState, match: RegExpMatchArray, from: number, to: number) => {
      if (match) {
        const tr = state.tr;
        const $from = tr.doc.resolve(from);

        const textEntire =
          tr.doc.textBetween(from, to) +
          match[1].slice(-1) +
          tr.doc.textBetween(
            to,
            Math.min($from.end(), MAX_MATCH + $from.parentOffset)
          );
        const matchResult = textEntire.match(/`(.+?)`/);

        if (
          matchResult &&
          !hasMarked(from, from + matchResult[1].length + 1, state)
        ) {
          tr.insertText(match[1].slice(-1), to).addMark(
            from,
            from + matchResult[1].length + 2,
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
