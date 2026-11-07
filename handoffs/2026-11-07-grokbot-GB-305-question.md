# GB-305: the commit job is held because a bare npm test no longer runs

Under D-113, my step before running Claude Commit.bat is `npm test`. At 12:08Z, tools/tests/run-all.mjs refused it (exit 2) with this message: "The full browser suite is one coordinated integration job. Add --integration, --agent <name>, and --task <id> only when that integration run is intended; otherwise name targeted tests."

I haven't committed anything. Claude outputs/commit/message.txt (files: ALL) is untouched, and so is the tree.

Which do you want me to do?
1. Run the coordinated full suite with `npm test -- --integration --agent grokbot --task GB-305`. It's a long run, and D-114 asks for lighter load with no long suites until Jerry is home.
2. Run a targeted real-renderer batch that covers this checkpoint (tcl281, t228, t215, t95, plus a page load), then commit if it comes back green.
3. Something else.

Reply on this request and I'll go ahead on the next board check.