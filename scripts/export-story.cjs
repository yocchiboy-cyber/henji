'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'henji.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
  constructor() { this.children = []; this.classList = { toggle() {} }; }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  focus() {}
  setAttribute() {}
}
const elements = {};
const context = vm.createContext({
  document: {getElementById: id => elements[id] ??= new Element(), createElement: () => new Element()},
  window: {scrollTo() {}},
  localStorage: {getItem: () => null, setItem() {}}
});
vm.runInContext(source, context);
const story = vm.runInContext('story', context);
const lines = ['# 返事 — 全場面と分岐', '', '> henji.htmlから生成したレビュー用原稿です。編集は本体で行い、npm run docsで再生成してください。', '', '場面IDは参照用です。掲載順は一本道の読書順ではありません。各場面末尾の分岐先を参照してください。', ''];
for (const [id, node] of Object.entries(story)) {
  lines.push(`## ${id} — ${node.chapter || '間'}`, '');
  if (node.blank) lines.push('［言葉のない余白］', '');
  for (const paragraph of node.p) lines.push(paragraph, '');
  if (node.choices) for (const [label, target] of node.choices) lines.push(`- ${label} → [${target}](#${target})`);
  else lines.push(`次の場面：${node.next}`);
  lines.push('');
}
// Headings contain Japanese; use explicit anchors for stable branch links.
const anchored = lines.map(line => line.startsWith('## ') ? `<a id="${line.slice(3).split(' — ')[0]}"></a>\n\n${line}` : line);
anchored.push('<a id="coverend"></a>', '', '## coverend — 終幕', '', '物語は、ここで終わりです', '', '# 返事', '', '自分の返事は、まだ待っていなかった。', '', '「選んだ言葉を振り返る」または再読を選べます。「戻る」で最後の場面へ戻れます。', '');
fs.writeFileSync(path.join(root, 'docs/story.md'), anchored.join('\n'));
const out = ['# 立ち止まりながら読む — 問いと解説', '', '> henji.htmlから自動生成。3場面の問いを、経路ごとの解説も含めて記載しています。', ''];
const variants = [
  [1, '身体のつらさを尋ねた経路', {first:'body'}],
  [1, '励ました経路', {first:'encourage'}],
  [1, '描き直しを尋ねた経路', {first:'drawing'}],
  [2, '待った経路', {approach:'wait'}],
  [2, '描けない箇所を尋ねた経路', {approach:'ask'}],
  [2, '仲間の手を借りる案を提案した経路', {approach:'suggest'}],
  [3, '後輩への返事を振り返る', {}]
];
for (const [number, variant, state] of variants) {
  vm.runInContext(`state = ${JSON.stringify(state)}`, context);
  const c = vm.runInContext(`checkpoint(${number})`, context);
  out.push(`## ${number}. ${c.title} — ${variant}`, '', c.quote || '［直前にプレーヤーが選んだ後輩への返事を表示］', '', c.question, '');
  c.options.forEach((option, index) => out.push(`### 選択：${option}`, '', c.feedback[index], ''));
  out.push('### 解説と次に試すこと', '', c.takeaway, '', c.action, '');
}
out.push('各問いではスキップも可能。回答後は元の場面に戻り、物語を続けます。', '');
fs.writeFileSync(path.join(root, 'docs/checkpoints.md'), out.join('\n'));
console.log(`Exported ${Object.keys(story).length} scenes and ${variants.length} checkpoint variants.`);
