import { MarkType } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

const MAX_MATCH = 500;

function run(
  mark: MarkType,
  view: EditorView,
  from: number,
  to: number,
  text: string
) {
  if (view.composing) return false;
  return false;
}

function onArrowDown(view: EditorView, event: KeyboardEvent) {}

export function buildInlineCode(): Plugin {
  const plugin = new Plugin({
    view() {
      return {
        update(view, prevState) {
          const prevText = prevState.doc.textBetween(
            prevState.selection.from - 1,
            prevState.selection.to
          );

          if (prevText === "`") {
            const $textBeforePos = prevState.doc.resolve(
              prevState.selection.from - 2
            );
            if (
              $textBeforePos
                .marks()
                .includes(view.state.schema.marks.code.create())
            ) {
              const textBefore = prevState.doc.textBetween(
                Math.max(0, $textBeforePos.textOffset - MAX_MATCH),
                prevState.selection.from
              );
              const matchInlineCode = textBefore.match(/`(.+?)`/);
              if (matchInlineCode) {
                const tr = view.state.tr;
                tr.delete(
                  prevState.selection.from - 1,
                  prevState.selection.from
                ).delete(
                  prevState.selection.from - matchInlineCode[1].length - 2,
                  prevState.selection.from - matchInlineCode[1].length - 1
                );

                view.dispatch(tr);
              }
            }
          }
        },
      };
    },
    props: {
      handleTextInput(view, from, to, text) {
        return run(view.state.schema.marks.code, view, from, to, text);
      },
      handleDOMEvents: {
        keydown(view, event) {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key
            )
          ) {
            onArrowDown(view, event);
          }
        },
      },
    },
  });
  return plugin;
}
