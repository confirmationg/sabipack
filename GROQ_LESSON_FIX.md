# SabiPack AI lesson-generation fix

This update fixes the AI lesson/quiz response format and makes the Groq request more tolerant of model-specific JSON-mode errors.

## What changed

- The lesson prompt now clearly requires two top-level JSON keys: `lesson` and `questions`. The quiz is no longer described as part of the `lesson` object.
- The response normalizer also accepts a model response that nests `questions` inside `lesson`, then moves the questions to the top level expected by SabiPack's validator and student app.
- Lesson generation now makes up to three attempts. If Groq rejects constrained JSON mode with HTTP 400, the next attempt retries without `response_format` while retaining strict JSON-only instructions in the prompt.
- On an HTTP 400 retry, the optional `GROQ_REASONING_EFFORT` parameter is also omitted. This avoids an unsupported optional parameter preventing a retry on model IDs that do not accept it.
- If the model returns invalid or incomplete content, the next attempt includes a short correction instruction based on the validation failure.
- Groq error reporting now preserves more of the returned error details, including its error code and `failed_generation` text when supplied.

## Deployment checklist

1. Replace the files in your GitHub repository with the contents of this ZIP's `sabipack/` folder.
2. In your hosting provider's environment variables, confirm `GROQ_API_KEY` is set to your Groq API key and `GROQ_MODEL` is set to an exact model ID currently available to your Groq account.
3. If you set `GROQ_REASONING_EFFORT`, this version will automatically omit it on an HTTP 400 retry. You can also remove it from the hosting environment if your chosen model does not support it.
4. Redeploy the project after pushing the changes.
5. Test **Try the AI** with a straightforward topic such as `Osmosis` and subject `Biology`. Confirm that it produces both the lesson and quiz questions.

Do not put your Groq API key in frontend files or commit it to GitHub. Keep it only in your hosting provider's server-side environment variables.

## Test status

The lesson-generation tests and the validation, API, try, pack, extraction and notes-reading tests pass locally. The full `npm test` command still stops at the pre-existing `scripts/test-account.mjs` assertion (expected HTTP 400, received HTTP 503); this account-test failure is separate from the lesson-generation changes. A live Groq API call was not run as part of local tests, so complete one live lesson-generation test after deployment.
