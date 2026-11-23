# Kickoff prompt

Paste everything below the line into a new Claude Code session opened on this repository, with the project brief and reference-sources PDFs attached. If the session is not on this repository, paste the full contents of `SPEC.md` after it.

---

You are building a website from a finished specification. Every design, structure, copy and architecture decision has already been made and is written in `SPEC.md` at the root of this repository. If the file is not there, its contents are pasted below this message.

I have attached the owner's project brief and reference notes as background. `SPEC.md` already contains everything from them that the site needs. If you find a business fact in the brief that contradicts `SPEC.md`, the brief wins, and you tell me.

Start by reading `SPEC.md` in full. Then open `design/reference-comp.html` and the screenshots beside it, which show the look you are matching.

Build the whole site as specified: the page, the drawing and builder modules, the forms, the Worker endpoints, the build script, the tests and the checks. Deliver what the specification asks for at the scope it describes. Make routine judgment calls yourself and record them in `PROGRESS.md`. If you conclude that something in the specification is mistaken, say so in a sentence and carry on with the task as specified. The palette, typefaces, layout, drawing style and wording are settled, so do not redesign, and do not add sections, features, copy, dependencies or visual ideas of your own.

Use the frontend-design skill for the build and the review skills listed in section 13 for the critique pass, on the terms that section sets out.

Work in the order given in section 14, keep `PROGRESS.md` current, and commit at each step. You are finished when every check in section 12 passes and you can show the evidence for each one: the command you ran with its output, and screenshots at the three sizes. A plan, a partial build or a progress summary is not the finish. The owner's missing facts are not a reason to stop either; they are config values with sample data, by design.

Stop and ask me only if you need a credential I have not given you, or if two of the hard constraints in section 2 cannot both be met.

Do not deploy. When you finish, tell me what you built and whether every check passed, then what you could not verify and why, then what the owner still has to supply.
