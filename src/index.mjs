#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { checkAvailable, chat } from './ollama.mjs';
import { scoreInbox, splitByAttention, buildNarrationPrompt } from './digest.mjs';
import { searchCode, askCode } from './codesearch.mjs';

async function main() {
  const [sub, ...rest] = process.argv.slice(2);

  if (sub === 'search' || sub === 'ask') {
    return runCodeCommand(sub, rest);
  }

  // Back-compat: `torpor <inbox.json>` with no subcommand runs the digest,
  // same as the original release.
  return runDigest(sub);
}

async function runCodeCommand(sub, rest) {
  const [dir, ...queryParts] = rest;
  const query = queryParts.join(' ');
  if (!dir || !query) {
    console.error(`usage: torpor ${sub} <folder> <question>`);
    process.exit(1);
  }

  const status = await checkAvailable();
  if (!status.ok) {
    console.error(`torpor can't wake up: ${status.reason}`);
    process.exit(1);
  }

  if (sub === 'search') {
    console.log(`torpor: reading through ${dir} locally with ${status.embedModel}...\n`);
    const hits = await searchCode(dir, query);
    if (hits.length === 0) {
      console.log('Nothing to search in there.');
      return;
    }
    for (const h of hits) {
      console.log(`[${h.score.toFixed(2)}] ${h.file}:${h.startLine}`);
    }
    return;
  }

  console.log(`torpor: reading through ${dir} locally, then thinking about it with ${status.chatModel}...\n`);
  const { answer, hits } = await askCode(dir, query);
  console.log(answer);
  if (hits.length) {
    console.log('\nFrom:');
    for (const [i, h] of hits.entries()) {
      console.log(`  [${i + 1}] ${h.file}:${h.startLine}`);
    }
  }
}

async function runDigest(file) {
  if (!file) {
    console.error('usage: torpor <inbox.json>  |  torpor search <folder> <question>  |  torpor ask <folder> <question>');
    process.exit(1);
  }

  const status = await checkAvailable();
  if (!status.ok) {
    console.error(`torpor can't wake up: ${status.reason}`);
    process.exit(1);
  }

  const raw = await readFile(file, 'utf8');
  const messages = JSON.parse(raw);

  console.log(`torpor: barely awake. ${messages.length} message${messages.length === 1 ? '' : 's'} to get through, so I'll do it.`);
  const scored = await scoreInbox(messages);
  const { needsYou, fyi } = splitByAttention(scored);

  console.log(`\nWhile you were asleep: ${needsYou.length} of ${messages.length} actually need you. The other ${fyi.length} can wait.\n`);

  console.log(`In short (${status.chatModel}, running right here):`);
  const prompt = buildNarrationPrompt({ needsYou, fyi });
  const summary = await chat(prompt);
  console.log(summary.trim());

  if (needsYou.length) {
    console.log('\nWorth getting up for:');
    for (const m of needsYou) {
      console.log(`  [${m.attentionScore.toFixed(2)}] ${m.from} — ${m.subject}`);
    }
  }
  if (fyi.length) {
    console.log('\nCan stay asleep for these:');
    for (const m of fyi) {
      console.log(`  [${m.attentionScore.toFixed(2)}] ${m.from} — ${m.subject}`);
    }
  }
}

main().catch((err) => {
  console.error('torpor dozed off mid-task:', err.message);
  process.exit(1);
});
