import { doc } from "prettier";
const { utils, builders } = doc;

const { concat, hardline } = doc.builders;

process.env.PRETTIER_DEBUG = "true";

export const getVisitorKeys = (ast) => {
  if ("type" in ast) {
    return ast.type === "root" ? ["nodes"] : [];
  }

  return Object.values(ast)
    .filter((node) => {
      return node.type === "block";
    })
    .map((e) => e.id);
};

export function print(path, options, print) {
  const node = path.node;
  if (!node) {
    return [];
  }

  if (node.type === "expression") {
    return printExpression(node);
  }

  if (node.type === "statement") {
    return printStatement(node);
  }

  if (node.type === "comment") {
    return builders.group([builders.join(" ", ["<%#", node.content, "%>"])], {
      shouldBreak: true, // I dunno if this will have consequences in another parts
    });
  }

  return [];
}

export function embed() {
  return async (textToDoc, print, path, options) => {
    const node = path.node;

    // Format ruby code before constructing the Doc
    if ("nodes" in node) {
      for (const n of Object.values(node.nodes)) {
        await formatRubyCode(n, textToDoc, options);
      }
    }

    if (!node || !["root", "block"].includes(node.type)) {
      return undefined;
    }

    const mapped = await Promise.all(
      splitAtElse(node).map(async (content) => {
        let doc;
        if (content in node.nodes) {
          doc = content;
        } else {
          doc = await textToDoc(content, { ...options, parser: "html" });
        }

        return utils.mapDoc(doc, (currentDoc) => {
          if (typeof currentDoc !== "string") {
            return currentDoc;
          }

          const idxs = findPlaceholders(currentDoc);
          if (idxs.length === 0) {
            return currentDoc;
          }
          let res = [];
          let lastEnd = 0;

          for (const { start, end } of idxs) {
            if (lastEnd < start) {
              res.push(currentDoc.slice(lastEnd, start));
            }

            const p = currentDoc.slice(start, end);

            if (p in node.nodes) {
              res.push(path.call(print, "nodes", p));
            } else {
              res.push(p);
            }

            lastEnd = end;
          }

          if (lastEnd > 0 && currentDoc.length > lastEnd) {
            res.push(currentDoc.slice(lastEnd));
          }

          return res;
        });
      }),
    );

    if (node.type === "block") {
      return buildBlock(path, print, node, mapped);
    }

    return [...mapped, builders.hardline];
  };
}

// Checks if there is content between case and when, not only whitespace
const blockHasContentBetweenCaseAndWhen = (block) => {
  if (block.start.keyword !== "case") {
    return false;
  }

  const firstPlaceholder = findPlaceholders(block.content)[0];
  if (firstPlaceholder.length === 0) {
    return false;
  }

  const isThereOnlyWhiteSpace = block.content
    .slice(0, firstPlaceholder.start)
    .match(/^\s*$/);

  if (isThereOnlyWhiteSpace != null) {
    return true;
  }
};

const buildBlock = (path, print, block, mapped) => {
  if (block.containsNewLines) {
    const doc = builders.group([
      path.call(print, "nodes", block.start.id),
      builders.indent([
        blockHasContentBetweenCaseAndWhen(block) ? "" : builders.softline,
        mapped,
      ]),
      builders.hardline,
      path.call(print, "nodes", block.end.id),
    ]);

    return doc;
  }

  return builders.group([
    path.call(print, "nodes", block.start.id),
    mapped,
    path.call(print, "nodes", block.end.id),
  ]);
};

const splitAtElse = (node) => {
  const elseNodes = Object.values(node.nodes).filter(
    (n) =>
      n.type === "statement" &&
      ["else", "elsif", "when"].includes(n.keyword) &&
      node.content.search(n.id) !== -1,
  );

  if (elseNodes.length === 0) {
    return [node.content];
  }

  const re = new RegExp(`(${elseNodes.map((e) => e.id).join(")|(")})`);
  return node.content.split(re).filter(Boolean);
};

export const findPlaceholders = (text) => {
  let i = 0;
  let res = [];

  let match;
  while ((match = text.slice(i).match(/#~\d+~#/)) != null) {
    const matchLength = match[0].length;

    res.push({
      id: match[0],
      start: i + match.index,
      end: i + match.index + match[0].length,
    });

    i += match.index + matchLength;
  }

  return res;
};

const printExpression = (node) => {
  const multiline = node.content.includes("\n");
  const openingErb = "<%=" + node.delimiters.start;
  const closingErb = node.delimiters.end + "%>";

  if (multiline) {
    const lines = node.content.split("\n");
    const templateIndicatorSpace = " ".repeat((openingErb + " ").length);

    return builders.group(
      [
        node.preNewLines > 1 ? hardline : "",
        concat([
          [openingErb, " "],
          ...lines.map((line, i) => [
            i !== 0 ? templateIndicatorSpace : "",
            line,
            i !== lines.length - 1 ? hardline : "",
          ]),
          [" ", closingErb],
        ]),
      ],
      { shouldBreak: node.preNewLines > 0 },
    );
  }

  return builders.group(
    [
      node.preNewLines > 1 ? hardline : "",
      builders.join(" ", [
        openingErb,
        builders.indent(node.content),
        closingErb,
      ]),
    ],
    {
      shouldBreak: node.preNewLines > 0,
    },
  );
};

const printStatement = (node) => {
  const multiline = node.content.includes("\n");
  const openingErb = "<%" + node.delimiters.start;
  const closingErb = node.delimiters.end + "%>";

  if (multiline) {
    const lines = node.content.split("\n");
    const templateIndicatorSpace = " ".repeat((openingErb + " ").length);

    return builders.group(
      [
        node.preNewLines > 1 ? hardline : "",
        concat([
          [openingErb, " "],
          ...lines.map((line, i) => [
            i !== 0 ? templateIndicatorSpace : "",
            line,
            i !== lines.length - 1 ? hardline : "",
          ]),
          [" ", closingErb],
        ]),
      ],
      { shouldBreak: node.preNewLines > 0 },
    );
  }

  const statement = builders.group(
    [
      node.preNewLines > 1 ? hardline : "",
      builders.join(" ", [openingErb, node.content, closingErb]),
    ],
    { shouldBreak: node.preNewLines > 0 },
  );

  if (
    ["else", "elsif", "when"].includes(node.keyword) &&
    surroundingBlock(node)?.containsNewLines
  ) {
    return [builders.dedent(builders.hardline), statement, builders.hardline];
  }

  return statement;
};

const surroundingBlock = (node) => {
  return Object.values(node.nodes).find(
    (n) => n.type === "block" && n.content.search(node.id) !== -1,
  );
};

const IF_BLOCK_FALSE = "if true\n";
const END_BLOCK_FALSE = "\nend";
const INCOHERENT_LINES = "\n  @var = 2\n  @var3 = 4";
const WHEN_BLOCK_FALSE = "\nwhen 'block_false'";
const CASE_BLOCK_FALSE = "case @test\n";

const formatStatementBlock = async (node, textToDoc, options) => {
  if (node.keyword === "when") {
    const contentFalsed = CASE_BLOCK_FALSE + node.content + END_BLOCK_FALSE;
    const doc = await textToDoc(contentFalsed, { ...options, parser: "ruby" });

    const numberLinesExtraTop = CASE_BLOCK_FALSE.split("\n").length - 1;
    const numberLinesExtraBottom = END_BLOCK_FALSE.split("\n").length - 1;
    return doc
      .split("\n")
      .slice(numberLinesExtraTop, -numberLinesExtraBottom)
      .join("\n");
  }

  if (node.keyword === "case") {
    const contentFalsed = node.content + WHEN_BLOCK_FALSE + END_BLOCK_FALSE;
    const doc = await textToDoc(contentFalsed, { ...options, parser: "ruby" });

    const numberLinesExtraBottom =
      (WHEN_BLOCK_FALSE + END_BLOCK_FALSE).split("\n").length - 1;
    return doc.split("\n").slice(0, -numberLinesExtraBottom).join("\n");
  }

  if (node.keyword === "if") {
    const contentFalsed = node.content + END_BLOCK_FALSE;
    const doc = await textToDoc(contentFalsed, { ...options, parser: "ruby" });

    const numberLinesExtraBottom = END_BLOCK_FALSE.split("\n").length - 1;
    return doc.split("\n").slice(0, -numberLinesExtraBottom).join("\n");
  }

  if (node.keyword === "else") {
    const contentFalsed = IF_BLOCK_FALSE + node.content + END_BLOCK_FALSE;
    const doc = await textToDoc(contentFalsed, { ...options, parser: "ruby" });

    const numberLinesExtraTop = IF_BLOCK_FALSE.split("\n").length - 1;
    const numberLinesExtraBottom = END_BLOCK_FALSE.split("\n").length - 1;
    return doc
      .split("\n")
      .slice(numberLinesExtraTop, -numberLinesExtraBottom)
      .join("\n");
  }

  if (node.keyword === "elsif") {
    const contentFalsed = IF_BLOCK_FALSE + node.content + END_BLOCK_FALSE;
    const doc = await textToDoc(contentFalsed, { ...options, parser: "ruby" });

    const numberLinesExtraTop = IF_BLOCK_FALSE.split("\n").length - 1;
    const numberLinesExtraBottom = END_BLOCK_FALSE.split("\n").length - 1;
    return doc
      .split("\n")
      .slice(numberLinesExtraTop, -numberLinesExtraBottom)
      .join("\n");
  }

  const contentFalsed = node.content + INCOHERENT_LINES + END_BLOCK_FALSE;
  let doc = await textToDoc(contentFalsed, { ...options, parser: "ruby" });

  const numberLinesExtraBottom =
    (INCOHERENT_LINES + END_BLOCK_FALSE).split("\n").length - 1;
  return doc.split("\n").slice(0, -numberLinesExtraBottom).join("\n");
};

const formatExpressionBlock = async (node, textToDoc, options) => {
  const contentWithEnd = node.content + INCOHERENT_LINES + END_BLOCK_FALSE;
  let doc = await textToDoc(contentWithEnd, { ...options, parser: "ruby" });

  const numberLinesExtraBottom =
    (INCOHERENT_LINES + END_BLOCK_FALSE).split("\n").length - 1;

  return doc.split("\n").slice(0, -numberLinesExtraBottom).join("\n");
};

const formatRubyCode = async (node, textToDoc, options) => {
  if (
    node.contentPreRubyParser ||
    !["expression", "statement"].includes(node.type) ||
    node.keyword === "end" ||
    node.content.startsWith("yield")
  ) {
    return;
  }

  let doc;
  if (node.startBlock || ["else", "elsif", "when"].includes(node.keyword)) {
    // We don't care if its an expressin or an statement

    if (node.type === "expression") {
      doc = await formatExpressionBlock(node, textToDoc, options);
    }
    if (node.type === "statement") {
      doc = await formatStatementBlock(node, textToDoc, options);
    }
  } else {
    doc = await textToDoc(node.content, { ...options, parser: "ruby" });
  }

  node.contentPreRubyParser = node.content;
  node.content = doc;
};
