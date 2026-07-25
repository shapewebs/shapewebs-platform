"use client";

import { useActionState, useEffect, useRef } from "react";
import { Buttons } from "@shapewebs/ui";

type PreviewSavedPageState =
  | {
      status: "idle";
    }
  | {
      endpoint: string;
      status: "ready";
      token: string;
    }
  | {
      status: "unavailable";
    };

const initialState: PreviewSavedPageState = {
  status: "idle",
};

type PreviewSavedRevisionFormProps = {
  previewAction: (
    state: PreviewSavedPageState,
    formData: FormData,
  ) => Promise<PreviewSavedPageState>;
  disabled: boolean;
  documentId: string;
  localeCode: string;
  revisionId: string;
};

export function PreviewSavedRevisionForm({
  previewAction,
  disabled,
  documentId,
  localeCode,
  revisionId,
}: PreviewSavedRevisionFormProps) {
  const [state, formAction, pending] = useActionState(
    previewAction,
    initialState,
  );
  const transferForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ready") {
      transferForm.current?.requestSubmit();
    }
  }, [state]);

  return (
    <>
      <form action={formAction}>
        <input name="documentId" type="hidden" value={documentId} />
        <input name="localeCode" type="hidden" value={localeCode} />
        <input name="revisionId" type="hidden" value={revisionId} />
        <Buttons.Button
          disabled={disabled || pending}
          kind="tertiary"
          size="small"
          title="Preview the most recently saved revision in a private, time-limited session."
          type="submit"
        >
          {pending ? "Preparing preview..." : "Preview saved revision"}
        </Buttons.Button>
      </form>

      {state.status === "unavailable" ? (
        <p role="alert">The private preview could not be prepared.</p>
      ) : null}

      {state.status === "ready" ? (
        <form
          action={state.endpoint}
          method="post"
          ref={transferForm}
          target="_self"
        >
          <input name="token" type="hidden" value={state.token} />
          <noscript>
            <Buttons.Button kind="tertiary" size="small" type="submit">
              Open prepared preview
            </Buttons.Button>
          </noscript>
        </form>
      ) : null}
    </>
  );
}
