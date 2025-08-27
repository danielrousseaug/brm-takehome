# BRM Take‑Home --- Renewal Calendar

## Goal

Build a small full‑stack product that ingests "Purchase Agreement" PDFs
and presents a renewal calendar so customers can see upcoming deadlines.

## About BRM & Why This Exercise

BRM helps companies centralize vendor and purchase agreements, extract
the key terms and dates, and surface renewal and notice obligations so
nothing slips through the cracks.\
The workflow you'll build here---ingesting purchase‑agreement PDFs and
presenting a renewal calendar---mirrors a core problem we solve for
customers.\
We're interested in how you balance correctness, usability, and
engineering pragmatism under constraints.

## Overview

BRM helps teams track and act on contractual obligations. For this
exercise, your job is intentionally minimal:

- Upload purchase‑agreement PDFs.
- Display a renewal calendar that shows the dates when agreements
  require attention/renewal.

That's the only hard requirement. Everything else (data model,
extraction approach, UI polish, APIs, editing, etc.) is at your
discretion.\
We want to see your product thinking: what you choose to build beyond
the minimum and why.

## What We Provide

- Sample Purchase Agreement PDFs with format differences. (Feel free
  to make more of your own and include them in your submission.)
- An OpenRouter API key (sent to you via email).

## OpenRouter Access

You should have received an OpenRouter API key in the email accompanying
this exercise.\
OpenRouter provides a unified API that lets you call models from
multiple providers using a single key and endpoint.\
Use it to choose and call whatever model(s) you want for your project.

Quickstart: https://openrouter.ai/docs/quickstart

## Minimum Deliverable

A runnable app where we can upload the provided PDFs and see a calendar
of renewal dates derived from those documents.

---

## What We're Evaluating (Rubric)

- Product thinking & prioritization --- Clear MVP, sensible UX,
  obvious next steps.
- Solution design & data modeling --- Clean architecture; sound date
  logic.
- Code quality --- Readability, modularity, naming, comments.
- UX & usability --- Easy to upload, review, correct, and visualize.
- Reliability
- Clarity of README.md — Easy to set up and run; clear summary of what was built, why, and the tradeoffs made.
  summary of what was built, what tradeoffs you made, what tools you
  used and why, etc.
- Engineering tradeoffs and decisions.

## Submission Guidelines

- Return your submission as a ZIP file (a git repo inside is welcome).
- Include a README that explains: what you built; what you didn't;
  what tools you used; the technical decisions you made and why; and
  what you would prioritize next if you had more time.\
  Remember that startups are always pressed for time --- what we
  choose to not build is as important as what we choose to build ---
  so justify your prioritization decisions.
- Make sure your README includes simple setup/run instructions.
- **Additionally, submit either (a) a short video of what you built
  or (b) a hosted version.**\
  We try our best to run every application submitted, but sometimes
  submitted applications don't have sufficient instructions or contain
  small bugs that prevent us from running them. In those cases, having a fallback makes it easier for us to still
  review your submission.

## FAQ

**Can I use libraries/services for PDF and OCR?**\
Yes, use any tools you want. Please document your choices.

**Can I use AI coding tools?**\
Yes, please use any tools you would use to build a great project in a
real environment.
