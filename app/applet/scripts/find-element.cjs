const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function getTagName(node, sf) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText(sf);
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText(sf);
  return null;
}

function getChildren(node) {
  if (ts.isJsxElement(node)) {
    return node.children.filter(c => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c));
  }
  return [];
}

function getSelectorPath(node, pathStack, sf) {
  const parts = [];
  for (let i = 0; i < pathStack.length; i++) {
    const curr = pathStack[i];
    const parent = i > 0 ? pathStack[i - 1] : null;
    const tag = getTagName(curr, sf);
    if (!tag) continue;
    if (!parent) {
      parts.push(`${tag}:nth-of-type(1)`);
      continue;
    }
    const siblings = getChildren(parent).filter(c => getTagName(c, sf) === tag);
    const idx = siblings.indexOf(curr) + 1;
    parts.push(`${tag}:nth-of-type(${idx})`);
  }
  return parts.join(' > ');
}

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function walk(node, stack) {
    const tag = getTagName(node, sf);
    const newStack = tag ? [...stack, node] : stack;

    if (tag === 'button') {
      const fullPath = getSelectorPath(node, newStack, sf);
      // check if it matches pattern: div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)
      if (fullPath.includes('div:nth-of-type(3)') || fullPath.includes('div:nth-of-type(2)')) {
        console.log(`[${filePath}]`);
        console.log(`  Path: ${fullPath}`);
        console.log(`  Button snippet: ${node.getText(sf).slice(0, 120).replace(/\s+/g, ' ')}\n`);
      }
    }

    if (ts.isJsxElement(node)) {
      node.children.forEach(c => walk(c, newStack));
    } else {
      ts.forEachChild(node, c => walk(c, stack));
    }
  }

  walk(sf, []);
}

function walkDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walkDir(full);
    else if (f.endsWith('.tsx')) analyzeFile(full);
  }
}

walkDir(path.join(__dirname, '../src'));
