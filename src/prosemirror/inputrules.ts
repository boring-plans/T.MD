import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  InputRule,
} from "prosemirror-inputrules";
import { NodeType, Schema } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";

/// Given a blockquote node type, returns an input rule that turns `"> "`
/// at the start of a textblock into a blockquote.
function blockQuoteRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType);
}

/// Given a list node type, returns an input rule that turns a number
/// followed by a dot at the start of a textblock into an ordered list.
function orderedListRule(nodeType: NodeType) {
  return wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    (match) => ({ order: +match[1] }),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  );
}

/// Given a list node type, returns an input rule that turns a bullet
/// (dash, plush, or asterisk) at the start of a textblock into a
/// bullet list.
function bulletListRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
}

/// Given a code block node type, returns an input rule that turns a
/// textblock starting with three backticks into a code block.
function codeBlockRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^```$/, nodeType);
}

/// Given a node type and a maximum level, creates an input rule that
/// turns up to that number of `#` characters followed by a space at
/// the start of a textblock into a heading whose level corresponds to
/// the number of `#` signs.
function headingRule(nodeType: NodeType, maxLevel: number) {
  return textblockTypeInputRule(
    new RegExp("^(#{1," + maxLevel + "})\\s$"),
    nodeType,
    (match) => ({ level: match[1].length })
  );
}

/**
 * Add a horizontal line when typing in '---' or '___' or '***' in one new line.
 * What's more, when the new line is the bottom of whole document,
 * or next line is horizontal line already, add one new line.
 */
function horizontalRule(nodeType: NodeType) {
  return new InputRule(
    /^(_{3}|-{3}|\*{3})$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ) => {
      if (match[1]) {
        let tr: Transaction = state.tr;
        const $start = tr.doc.resolve(start);

        if (
          $start.after() === $start.end(-1) ||
          $start.doc.resolve($start.after()).nodeAfter?.type === nodeType
        ) {
          tr = tr.insert($start.after(), state.schema.nodes.paragraph.create());
        }

        return tr.delete(start, end).insert(start, nodeType.create());
      }

      return null;
    }
  );
}

/// A set of input rules for creating the basic block quotes, lists,
/// code blocks, and heading.
export function buildInputRules(schema: Schema) {
  const rules = [];
  let type: NodeType;

  if ((type = schema.nodes.blockquote)) rules.push(blockQuoteRule(type));
  if ((type = schema.nodes.ordered_list)) rules.push(orderedListRule(type));
  if ((type = schema.nodes.bullet_list)) rules.push(bulletListRule(type));
  if ((type = schema.nodes.code_block)) rules.push(codeBlockRule(type));
  if ((type = schema.nodes.heading)) rules.push(headingRule(type, 6));
  if ((type = schema.nodes.horizontal_rule)) rules.push(horizontalRule(type));

  return inputRules({ rules });
}
