import { useState, useMemo } from "react";
import "./Body.css";

function syntaxHighlightJson(jsonStr) {
  if (!jsonStr) return "";
  const escaped = jsonStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key";
        } else {
          cls = "json-string";
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

const Body = ({ body }) => {
  const [viewMode, setViewMode] = useState("pretty");
  const [copied, setCopied] = useState(false);

  const formattedStrings = useMemo(() => {
    let rawStr = "";
    let prettyStr = "";
    let isJson = false;
    let byteCount = 0;

    if (body === undefined || body === null) {
      return { rawStr: "(Empty body)", prettyStr: "(Empty body)", isJson: false, byteCount: 0 };
    }

    if (typeof body === "object") {
      isJson = true;
      rawStr = JSON.stringify(body);
      prettyStr = JSON.stringify(body, null, 2);
    } else if (typeof body === "string") {
      rawStr = body;
      try {
        const parsed = JSON.parse(body);
        isJson = true;
        prettyStr = JSON.stringify(parsed, null, 2);
      } catch {
        prettyStr = body;
      }
    } else {
      rawStr = String(body);
      prettyStr = String(body);
    }

    byteCount = new Blob([rawStr]).size;
    return { rawStr, prettyStr, isJson, byteCount };
  }, [body]);

  const copyToClipboard = () => {
    const text = viewMode === "pretty" ? formattedStrings.prettyStr : formattedStrings.rawStr;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const highlightedHtml = useMemo(() => {
    if (viewMode === "pretty" && formattedStrings.isJson) {
      return syntaxHighlightJson(formattedStrings.prettyStr);
    }
    return null;
  }, [viewMode, formattedStrings]);

  return (
    <div className="body-panel">
      <div className="body-toolbar">
        <div className="body-toolbar-left">
          <div className="view-mode-tabs" role="group" aria-label="Payload view mode">
            <button
              type="button"
              className={`btn-mode ${viewMode === "pretty" ? "mode-active" : ""}`}
              onClick={() => setViewMode("pretty")}
            >
              Pretty
            </button>
            <button
              type="button"
              className={`btn-mode ${viewMode === "raw" ? "mode-active" : ""}`}
              onClick={() => setViewMode("raw")}
            >
              Raw
            </button>
          </div>

          <span className="body-bytes-badge mono">
            {formattedStrings.byteCount} bytes
          </span>
        </div>

        <button type="button" className="btn btn-sm" onClick={copyToClipboard}>
          {copied ? "Copied" : "Copy body"}
        </button>
      </div>

      <div className="body-content-card">
        {highlightedHtml ? (
          <pre
            className="mono body-pre"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="mono body-pre">
            {viewMode === "pretty" ? formattedStrings.prettyStr : formattedStrings.rawStr}
          </pre>
        )}
      </div>
    </div>
  );
};

export default Body;
