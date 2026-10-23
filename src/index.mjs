#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { checkAvailable, chat } from './ollama.mjs';
import { scoreInbox, splitByAttention, buildNarrationPrompt } from './digest.mjs';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: torpor <inbox.json>');
    process.exit(1);
  }

  const status = await checkAvailable();
  if (!status.ok) {
    console.error(`torpor needs a local Ollama running: ${status.reason}`);
    process.exit(1);
  }

  const raw = await readFile(file, 'utf8');
  const messages = JSON.parse(raw);

  console.log(`torpor: ${messages.length} messages, scoring locally with ${status.embedModel}...`);
  const scored = await scoreInbox(messages);
  const { needsYou, fyi } = splitByAttention(scored);

  console.log(`\nWhile you were away: ${messages.length} messages, ${needsYou.length} need you, ${fyi.length} can wait.\n`);

  console.log(`Summary (${status.chatModel}, local):`);
  const prompt = buildNarrationPrompt({ needsYou, fyi });
  const summary = await chat(prompt);
  console.log(summary.trim());

  if (needsYou.length) {
    console.log('\nNeeds you:');
    for (const m of needsYou) {
      console.log(`  [${m.attentionScore.toFixed(2)}] ${m.from} — ${m.subject}`);
    }
  }
  if (fyi.length) {
    console.log('\nFYI, no action needed:');
    for (const m of fyi) {
      console.log(`  [${m.attentionScore.toFixed(2)}] ${m.from} — ${m.subject}`);
    }
  }
}

main().catch((err) => {
  console.error('torpor failed:', err.message);
  process.exit(1);
});
