/* script.js
   Full typing engine:
   - Loads exercise from URL (?exercise=...)
   - Splits into 10 dynamic chunks
   - Timer (10 minutes default)
   - Input handling (navigate chunks with Enter/ArrowDown, back with ArrowUp)
   - Backspace counting
   - Full highlightErrors engine (handles missing/extra/merged/space/skipped)
   - PSSSB-style result calculation (gross/net chars, WPM, accuracy)
   - Result UI updates and saved test history (localStorage)
   - Defensive checks for missing DOM elements
*/
// Disable right click
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Disable keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Disable: F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+P
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ["U","S","C","V","X","A","P"].includes(e.key.toUpperCase()))
    ) {
        e.preventDefault();
        return false;
    }
});

// Disable copy / paste / cut
["copy", "paste", "cut"].forEach(evt => {
    document.addEventListener(evt, e => e.preventDefault());
});
// -------------------- Helper: Load paragraph from URL param --------------------

 // ensure previous/next by keyboard: PageUp/PageDown
  document.addEventListener('keydown', (e) => {

    if (e.code === 'PageDown' || e.key === 'PageDown') { e.preventDefault(); if (currentChunkIndex < chunks.length-1) { currentChunkIndex++; renderChunk(); } }
    if (e.code === 'PageUp' || e.key === 'PageUp') { e.preventDefault(); if (currentChunkIndex > 0) { currentChunkIndex--; renderChunk(); }
	}
  });
      
document.getElementById('typing-input').addEventListener('keydown', function(e) {
    if (e.key === "Tab") {
        e.preventDefault();
    }
});
// Disable right click
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Disable keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Disable: F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+P
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ["U","S","C","V","X","A","P"].includes(e.key.toUpperCase()))
    ) {
        e.preventDefault();
        return false;
    }
});

// Disable copy / paste / cut
["copy", "paste", "cut"].forEach(evt => {
    document.addEventListener(evt, e => e.preventDefault());
});


async function loadTestParagraph() {
  try {
    // ✅ First try to load from localStorage (safest path)
    const savedText = localStorage.getItem("selectedExerciseText");
    if (savedText) {
      localStorage.removeItem("selectedExerciseText");
  //   localStorage.removeItem("selectedExerciseLanguage");
      return savedText;
    }

    // ✅ Otherwise, load from URL (?exercise=...)
    const urlParams = new URLSearchParams(window.location.search);
    const encodedExercise = urlParams.get("exercise");

    if (encodedExercise) {
  try {
    // Safely decode URI component
    let decoded = decodeURIComponent(encodedExercise);

    // Normalize HTML entities to actual characters
    decoded = decoded
      .replace(/&quot;|&#34;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, "&");

    // Handle over-escaped double quotes (e.g., \" or \')
    decoded = decoded
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    return decoded.trim();
  } catch (decodeError) {
    console.warn("⚠️ Decode error, returning raw exercise text:", decodeError);
    let fallback = encodedExercise
      .replace(/&quot;|&#34;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
    return fallback.trim();
  }
}


    console.warn("No exercise found.");
    return "";
  } catch (err) {
    console.error("Error loading exercise:", err);
    return "";
  }
}



// -------------------- Global state (from your engine) --------------------
let fullParagraph = "";
let words = [];
let chunkSize = 0;
/* Test types (tests.js): when a test from the Test Centre is active, its minutes
   and pass rule replace the built-in 10-minute PSSSB defaults below. */
function smartechActiveTest() {
    return (window.SmartechTests && window.SmartechTests.activeCriteria()) || null;
}
function smartechTestSeconds() {
    const t = smartechActiveTest();
    return Math.round((t ? t.minutes : 10) * 60);
}
function smartechFmtTime(sec) {
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

window.paragraphs = [];
window.state = {
    currentParagraphIndex: 0,
    paragraph: "",
    defaultWords: [],
    typedWords: [],
    startTime: null,
    totalTime: smartechTestSeconds(), // 10 minutes default (or the selected test type's time)
    isTestRunning: false,
    totalTypedInput: "|",
    backspaceCount: 0
};

// Safe DOM helper
function $(id) { return document.getElementById(id); }
// -------------------- Initialize test and create chunks --------------------
async function initializeTest() {
    fullParagraph = await loadTestParagraph();
    // If no paragraph provided, keep existing text in DOM (useful for testing)
    if (!fullParagraph || fullParagraph.trim().length === 0) {
        // If paragraph element exists and contains text, use that
        const paragraphEl = $("paragraph");
        if (paragraphEl && paragraphEl.textContent.trim().length > 0) {
            fullParagraph = paragraphEl.textContent.trim();
        } else {
            fullParagraph = ""; // fallback empty
        }
    }

    // Normalize whitespace & trim
    fullParagraph = fullParagraph.replace(/\s+/g, " ").trim();
	fullParagraph = fullParagraph
  .replace(/&apos;|&#39;|&amp;apos;/g, "'")
  .replace(/&quot;|&#34;/g, '"')
  .replace(/&amp;/g, "&");

    words = fullParagraph.length ? fullParagraph.split(" ") : [];
    chunkSize = Math.max(1, Math.ceil(words.length / 10)); // try to create 10 chunks
    window.paragraphs.length = 0;
    for (let i = 0; i < words.length; i += chunkSize) {
        window.paragraphs.push(words.slice(i, i + chunkSize).join(" "));
    }
    if (window.paragraphs.length === 0) {
        window.paragraphs.push("");
    }
    window.state.currentParagraphIndex = 0;
    window.state.paragraph = window.paragraphs[0];
    window.state.defaultWords = window.state.paragraph.split(" ");
}

// -------------------- Restart (same exercise) --------------------
// Rebuilds the 10 chunks from the passage already held in `fullParagraph`.
// Deliberately does NOT call loadTestParagraph()/initializeTest() again:
// the passage is handed over via a localStorage key that is removed after
// its first read, so a second read on Restart would find nothing there and
// fall back to whatever chunk happened to be on screen — silently shrinking
// the passage to 1/10th of its real length. Reusing the cached text avoids
// that.
function restartTest() {
    words = fullParagraph.length ? fullParagraph.split(" ") : [];
    chunkSize = Math.max(1, Math.ceil(words.length / 10));
    window.paragraphs.length = 0;
    for (let i = 0; i < words.length; i += chunkSize) {
        window.paragraphs.push(words.slice(i, i + chunkSize).join(" "));
    }
    if (window.paragraphs.length === 0) window.paragraphs.push("");
}

// -------------------- New Exercise (routes by language) --------------------
const EXERCISE_LIST_PAGES = { English: "engtutor.html", Punjabi: "pbitutor.html", Hindi: "hinditutor.html" };
function goToExerciseList() {
    if (smartechActiveTest()) { window.location.href = "testexercises.html?id=" + encodeURIComponent(smartechActiveTest().id); return; }
    const lang = localStorage.getItem("selectedExerciseLanguage") || "English";
    window.location.href = EXERCISE_LIST_PAGES[lang] || EXERCISE_LIST_PAGES.English;
}

// -------------------- DOM ready setup --------------------
document.addEventListener("DOMContentLoaded", async () => {
    await initializeTest();

    if ($("paragraph")) {
        $("paragraph").innerHTML = window.state.paragraph || "No paragraph loaded. Please select an exercise.";
    }

    if (document.querySelector(".main-title")) {
        document.querySelector(".main-title").textContent = "Typing Practice Test";
    }
    document.title = "Typing Test";

    // Bind UI event listeners (some elements may not exist in minimal page)
    bindUI();

    // Prepare UI
    refreshTest();
    displaySavedStats();
});

// -------------------- Timer --------------------
function startTimer() {
    if (!window.state.isTestRunning) return;

    const currentTime = performance.now();
    const elapsed = (currentTime - window.state.startTime) / 1000;
    const timeLeft = window.state.totalTime - elapsed;

    // 🔥 HARD STOP CONDITION
    if (timeLeft <= 0) {
        window.state.isTestRunning = false;

        if ($("timer")) {
            $("timer").textContent = "Time: 0:00";
        }

        // Time is over: lock typing, show a short notice, then open the
        // results automatically (the button lets the user skip the wait).
        if ($("typing-input")) $("typing-input").disabled = true;
        if ($("time-over-popup")) {
            $("time-over-popup").style.display = "flex";
        }
        if ($("popup-ok-btn")) {
            $("popup-ok-btn").focus();
        }
        setTimeout(() => {
            const pop = $("time-over-popup");
            if (pop && pop.style.display !== "none") {
                pop.style.display = "none";
                submitResults();
            }
        }, 1500);

        return; // 🚀 VERY IMPORTANT → stops loop completely
    }

    // Normal timer update
    if ($("timer")) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        $("timer").textContent = `Time: ${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    // Continue loop
    requestAnimationFrame(startTimer);
}
window.startTimer = startTimer;

// -------------------- Input handling --------------------
function bindUI() {
    const typingInput = $("typing-input");
    if (typingInput) {
        typingInput.addEventListener("input", (event) => {
            if (!window.state.isTestRunning) {
                window.state.startTime = performance.now();
                window.state.isTestRunning = true;
                requestAnimationFrame(window.startTimer);
            }
        });

        typingInput.addEventListener("keydown", (event) => {
            // Count backspace keypresses
            if (event.key === "Backspace") {
                window.state.backspaceCount++;
            }

            const inputElement = event.target;
            const input = inputElement.value;
            const typedLength = input.trim().split(/\s+/).filter(word => word.length > 0).length;
            const defaultLength = window.state.defaultWords.length || 1;
            const minWordsRequired = Math.floor(0.8 * defaultLength);

            if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "PageDown") {
                // Prevent any action on Enter/ArrowDown if this is the last chunk
                if (window.state.currentParagraphIndex === window.paragraphs.length - 1) {
                    event.preventDefault();
                    return;
                }

                if (typedLength >= minWordsRequired) {
                    if (window.state.currentParagraphIndex < window.paragraphs.length - 1) {
                        const typedChunks = window.state.totalTypedInput.split("|").filter(chunk => chunk.length > 0);
                        typedChunks[window.state.currentParagraphIndex] = input;
                        window.state.totalTypedInput = "|" + typedChunks.join("|") + "|";
                        window.state.currentParagraphIndex++;
                        window.state.paragraph = window.paragraphs[window.state.currentParagraphIndex];
                        window.state.defaultWords = window.state.paragraph.split(" ");
                        if ($("paragraph")) $("paragraph").innerHTML = window.state.paragraph;
                        if ($("current-chunk")) $("current-chunk").textContent = `Current Chunk - ${window.state.currentParagraphIndex + 1}`;
                        if ($("typing-input")) $("typing-input").value = typedChunks[window.state.currentParagraphIndex] || "";
                        event.preventDefault();
                    }
                } else {
                    // If not enough typed words, block action (consistent)
                    event.preventDefault();
                }
            } else if ((event.key === "ArrowUp" || event.key === "PageUp") && window.state.currentParagraphIndex > 0) {
                const typedChunks = window.state.totalTypedInput.split("|").filter(chunk => chunk.length > 0);
                typedChunks[window.state.currentParagraphIndex] = input;
                window.state.totalTypedInput = "|" + typedChunks.join("|") + "|";
                window.state.currentParagraphIndex--;
                window.state.paragraph = window.paragraphs[window.state.currentParagraphIndex];
                window.state.defaultWords = window.state.paragraph.split(" ");
                if ($("paragraph")) $("paragraph").innerHTML = window.state.paragraph;
                if ($("current-chunk")) $("current-chunk").textContent = `Current Chunk - ${window.state.currentParagraphIndex + 1}`;
                if ($("typing-input")) $("typing-input").value = typedChunks[window.state.currentParagraphIndex] || "";
                event.preventDefault();
            }
        });
    }

    // Buttons & popups
    if ($("submit-btn")) $("submit-btn").addEventListener("click", submitResults);
    if ($("refresh-btn")) $("refresh-btn").addEventListener("click", () => { restartTest(); refreshTest(); });
    if ($("popup-ok-btn")) $("popup-ok-btn").addEventListener("click", () => { if ($("time-over-popup")) $("time-over-popup").style.display = "none"; submitResults(); });
    if ($("practice-another-btn")) $("practice-another-btn").addEventListener("click", goToExerciseList);
    if ($("back-btn")) $("back-btn").addEventListener("click", goToExerciseList);
    if ($("no-input-ok-btn")) $("no-input-ok-btn").addEventListener("click", () => { if ($("no-input-popup")) $("no-input-popup").style.display = "none"; });
    if ($("refresh-btn-2")) $("refresh-btn-2").addEventListener("click", () => { restartTest(); refreshTest(); });
    if ($("practice-another-btn-2")) $("practice-another-btn-2").addEventListener("click", goToExerciseList);

    // Fullscreen
    if ($("fullscreen-btn")) {
        $("fullscreen-btn").addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                    if ($("fullscreen-btn")) $("fullscreen-btn").textContent = "Exit Full Screen";
                }).catch(err => console.error(`Fullscreen error: ${err.message}`));
            } else {
                document.exitFullscreen().then(() => {
                    if ($("fullscreen-btn")) $("fullscreen-btn").textContent = "Full Screen";
                });
            }
        });
    }
}

// -------------------- Refresh and submit --------------------
function refreshTest() {
    window.state.currentParagraphIndex = 0;
    window.state.paragraph = window.paragraphs[0];
    window.state.defaultWords = window.state.paragraph.split(" ");
    window.state.totalTypedInput = "|";
    window.state.totalTime = smartechTestSeconds();
    window.state.isTestRunning = false;
    window.state.startTime = null;
    window.state.backspaceCount = 0;

    if ($("timer")) $("timer").textContent = "Time: " + smartechFmtTime(window.state.totalTime);
    if (document.querySelector(".main-title")) document.querySelector(".main-title").style.display = "block";
    if (document.querySelector(".test-section")) document.querySelector(".test-section").style.display = "block";
    if ($("current-chunk")) $("current-chunk").textContent = `Current Chunk - ${window.state.currentParagraphIndex + 1}`;
    if ($("current-chunk")) $("current-chunk").style.display = "block";
    if ($("paragraph")) { $("paragraph").style.display = "block"; $("paragraph").innerHTML = window.state.paragraph; }
    if ($("typing-input")) { $("typing-input").style.display = "block"; $("typing-input").value = ""; $("typing-input").disabled = false; }
    if (document.querySelector(".header-row")) document.querySelector(".header-row").style.display = "flex";
    if ($("timer")) $("timer").style.display = "block";
    if (document.querySelector(".reference-outer")) document.querySelector(".reference-outer").style.display = "block";
    if ($("test-area")) $("test-area").style.display = "block";
    if ($("reference-text")) $("reference-text").style.display = "block";
    if ($("submit-btn")) $("submit-btn").style.display = "inline-block";
    if ($("back-btn")) $("back-btn").style.display = "inline-block";

    if ($("results")) $("results").style.display = "none";
    if ($("results-table")) $("results-table").style.display = "none";
    if ($("results-title-row")) $("results-title-row").style.display = "none";
    // Hide other results rows if present
    try {
        document.querySelectorAll("#results-table tr:not(#results-title-row, #notes-section, #button-row)").forEach(row => row.style.display = "none");
    } catch (e) {}
    if ($("saved-stats-container")) $("saved-stats-container").style.display = "block";
    if ($("error-section")) $("error-section").style.display = "none";
    if ($("error-highlight")) $("error-highlight").style.display = "none";
}

// -------------------- Submit & Results --------------------
async function submitResults() {
	// ✅ Show results & hide typing UI
$("results").style.display = "block";
$("results-table").style.display = "table";
document.querySelectorAll("#results-table tr").forEach(r => { if (r.getAttribute("data-engine") !== "words") r.style.display = "table-row"; });
$("test-section").style.display = "none";

// ✅ Scroll to results at top
setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
}, 300);

    console.log("submitResults called");
    window.state.isTestRunning = false;
    const typingInputEl = $("typing-input");
    const currentInput = typingInputEl ? typingInputEl.value.trim() : "";
    const typedChunks = window.state.totalTypedInput.split("|").filter(chunk => chunk.length > 0);
    if (currentInput) typedChunks[window.state.currentParagraphIndex] = currentInput;
    const validChunks = typedChunks.filter(chunk => chunk.trim().length > 0);
    if (validChunks.length === 0) {
        if ($("no-input-popup")) $("no-input-popup").style.display = "flex";
        window.state.isTestRunning = true;
        return;
    }

    const finalTypedText = validChunks.join(" ").trim();
    window.state.typedWords = finalTypedText.split(/\s+/).filter(word => word.length > 0);
    const allDefaultWords = window.paragraphs.slice(0, validChunks.length).join(" ").split(" ");

    // PHHC-style tests ("engine: words"): judged on the WORDS typed, not on 5 characters = 1 word.
    // wordengine.js does the counting, fills the word rows of the Results table and saves the result.
    const _wt = smartechActiveTest();
    if (_wt && window.SmartechTests && SmartechTests.usesWordEngine(_wt) && window.SmartechWordEngine) {
        SmartechWordEngine.submitTest({
            test: _wt,
            pairs: validChunks.map((typed, i) => ({ ref: window.paragraphs[i] || "", typed: typed })),
            totalSeconds: window.state.totalTime,
            startTime: window.state.startTime,
            backspaces: window.state.backspaceCount,
            exerciseLabel: smartechExerciseLabel(),
            saveStats: saveTestStats
        });
        return;
    }

    // Build error tables HTML using highlightErrors
    let errorTablesHTML = "";
    for (let i = 0; i < validChunks.length; i++) {
        let chunkDefaultWords = window.paragraphs[i].split(" ");
        const chunkTypedText = validChunks[i] || "";
        const chunkTypedWords = chunkTypedText.split(/\s+/).filter(w => w.length > 0);

        // Speed and accuracy are judged on the TYPED text only: reference words after the last word
        // the student typed in this chunk were never reached, so they are not "skipped" (and cost
        // nothing). Skipped words are only those missed BETWEEN typed words. This holds for every
        // chunk (also one the student left with the arrow keys) and when extra words were typed.
        const chunkErrors = highlightErrors(chunkDefaultWords, chunkTypedWords, chunkTypedText, { trimUntypedTail: true });
        errorTablesHTML += `
            <table class="error-table" width="100%"border="2px" style="border-collapse:collapse;">
                <thead>
                    <tr>
                        <th width="50%">Original Chunk #${i + 1}</th>
                        <th width="50%">Typed Chunk #${i + 1}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td width="50%"><span class="given">${window.paragraphs[i]}</span></td>
                        <td width="50%">${chunkErrors || "No errors"}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    // Show/hide UI elements
    if (document.querySelector(".main-title")) document.querySelector(".main-title").style.display = "none";
    if (document.querySelector(".test-section")) document.querySelector(".test-section").style.display = "none";
    if ($("results")) $("results").style.display = "block";
    if ($("results-table")) $("results-table").style.display = "table";
    if ($("results-title-row")) $("results-title-row").style.display = "table-row";
    if ($("results-notes")) $("results-notes").style.display = "block";
    if ($("exam-note")) { $("exam-note").style.display = "block"; $("exam-note").innerHTML = smartechActiveTest() ? '<span class="red-asterisk">*</span>Once time is over the test cannot be resumed and the text typed cannot be edited afterwards.' : '<span class="red-asterisk">*</span>In the PSSSB exam, before time over Test Submisson not Allowed'; }
    if ($("pass-note")) { $("pass-note").style.display = "block"; $("pass-note").innerHTML = smartechActiveTest() ? SmartechTests.noteHTML(smartechActiveTest()) : '<span class="red-asterisk">*</span>To pass the test, you must type at least 1500 characters with 92% accuracy.'; }
    if ($("button-row")) $("button-row").style.display = "table-row";
    if ($("error-section")) $("error-section").style.display = "block";
    if ($("error-highlight")) { $("error-highlight").style.display = "block"; $("error-highlight").innerHTML = errorTablesHTML; }
    if ($("refresh-btn-2")) $("refresh-btn-2").style.display = "inline-block";
    if ($("practice-another-btn-2")) $("practice-another-btn-2").style.display = "inline-block";


    // --- compute times ---
    const endTime = performance.now();
    const elapsedTimeSeconds = window.state.startTime ? (endTime - window.state.startTime) / 1000 : 0;
    const minutesSpent = Math.floor(elapsedTimeSeconds / 60);
    const secondsSpent = Math.floor(elapsedTimeSeconds % 60);

    // --- gross characters calculation using the generated highlighted HTML ---
    let grossCharacters = 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = errorTablesHTML;

    // Process correct spans
    const correctSpans = tempDiv.querySelectorAll('.correct');
    for (const span of correctSpans) {
        if (!span.textContent.includes('[')) {
            grossCharacters += span.textContent.length;
        }
    }

    // Process wrong spans with rules
    const wrongSpans = tempDiv.querySelectorAll('.wrong');
    for (const span of wrongSpans) {
        const errorType = span.getAttribute('data-error-type');
        const txt = span.textContent || "";

        if (errorType === 'skip') {
            continue; // skipped default word — never typed, not counted
        }
        if (errorType === 'space') {
            // Only the missingSpace wrapper carries real typed characters
            // (a merged word); the extraSpace marker glyph is not itself a
            // typed character, so it contributes nothing.
            const typedLength = span.getAttribute('data-typed-length');
            if (typedLength) grossCharacters += parseInt(typedLength, 10);
            continue;
        }
        if (errorType === 'word') {
            if (span.hasAttribute('data-extra-word')) {
                // extra inserted word with no corresponding reference word —
                // not counted toward gross characters (no reference length to cap against)
                continue;
            }
            // regular wrong word — try to find next .given sibling to compare length
            const next = span.nextElementSibling;
            if (next && next.classList && next.classList.contains('given')) {
                const wrongWordLength = span.textContent.length;
                const givenWordLength = next.textContent.length;
                grossCharacters += Math.min(wrongWordLength, givenWordLength);
            } else {
                grossCharacters += span.textContent.length;
            }
            continue;
        }
        if (txt.includes('[Extra:')) {
            const m = txt.match(/\[Extra:\s*(.*?)\]/);
            if (m && m[1]) grossCharacters += m[1].length;
        }
    }

    // Add spaces between typed words (N-1)
    const totalWords = finalTypedText.split(/\s+/).filter(w => w.length > 0).length;
    if (totalWords > 1) {
        grossCharacters += totalWords - 1;
    }

    const wordCount = (grossCharacters / 5).toFixed(1);
    const skippedWordsCount = (errorTablesHTML.match(/data-error-type="skip"/g) || []).length;
    const wrongExtraWordsCount = (errorTablesHTML.match(/data-error-type="word"/g) || []).length;
    const extraWordsCount = (errorTablesHTML.match(/data-extra-word="true"/g) || []).length;
    const wrongWordsCount = Math.max(0, wrongExtraWordsCount - extraWordsCount);
    const spaceErrorsCount = (errorTablesHTML.match(/data-error-type="space"/g) || []).length;

    // PSSSB rule: every mistake (wrong word, extra word, skipped word, or space
    // error) is penalized the same flat "word length" of 5 characters — there is
    // no half-weight for space errors under the official PSSSB formula.
    const totalMistakes = skippedWordsCount + wrongExtraWordsCount + spaceErrorsCount;
    const errorCharacters = totalMistakes * 5;
    const netCharacters = (grossCharacters - errorCharacters).toFixed(1);

    // PSSSB rule: Gross Speed = Gross characters / (5 x 10 min), decimal truncated
    // (not rounded) to a whole number.
    const totalMinutes = window.state.totalTime / 60;
    const grossSpeed = Math.floor(grossCharacters / (5 * totalMinutes));
    const timeSpentInMinutes = elapsedTimeSeconds > 0 ? (elapsedTimeSeconds / 60) : 0.0001;
    const actualGrossSpeed = (grossCharacters / (5 * timeSpentInMinutes)).toFixed(1);
    const accuracyPercentage = grossCharacters > 0 ? Math.max(0, (100 * netCharacters) / grossCharacters).toFixed(1) : 0; // never below 0%

    // PSSSB pass rule: minimum Gross Speed of 30 WPM AND at least 92% accuracy.
    // (a test type chosen in the Test Centre brings its own minutes / speed / accuracy / basis)
    const _tc = smartechActiveTest();
    const result = _tc
        ? (SmartechTests.evaluate(_tc, grossCharacters, netCharacters, accuracyPercentage).passed ? "Pass" : "Fail")
        : ((grossSpeed >= 30 && accuracyPercentage >= 92) ? "Pass" : "Fail");

    // Update UI values
    if ($("gross-characters-value")) $("gross-characters-value").textContent = `${grossCharacters} (Words = ${wordCount})`;
    if ($("skipped-words-value")) $("skipped-words-value").textContent = `${skippedWordsCount}`;
    if ($("wrong-extra-words-value")) $("wrong-extra-words-value").textContent = `${wrongExtraWordsCount}`;
    if ($("wrong-words-value")) $("wrong-words-value").textContent = `${wrongWordsCount}`;
    if ($("extra-words-value")) $("extra-words-value").textContent = `${extraWordsCount}`;
    if ($("space-errors-value")) $("space-errors-value").textContent = `${spaceErrorsCount}`;
    if ($("error-characters-value")) $("error-characters-value").textContent = `${errorCharacters}`;
    if ($("net-characters-value")) $("net-characters-value").textContent = `${netCharacters}`;
    if ($("gross-speed-value")) $("gross-speed-value").textContent = _tc ? `${grossSpeed} WPM (${_tc.name} ${totalMinutes} Min Rule)` : `${grossSpeed} WPM (According to PSSSB 10 Min Rule)`;
    if ($("actual-gross-speed-value")) $("actual-gross-speed-value").textContent = `${actualGrossSpeed} WPM`;
    if ($("exercise-no-value")) $("exercise-no-value").textContent = smartechExerciseLabel();
    if ($("time-spent-value")) $("time-spent-value").textContent = `${minutesSpent} min ${secondsSpent.toString().padStart(2, "0")} sec`;
    if ($("accuracy-percentage-value")) $("accuracy-percentage-value").textContent = `${accuracyPercentage}%`;
    if ($("backspace-count-value")) $("backspace-count-value").textContent = `${window.state.backspaceCount}`;
    if ($("result-value")) $("result-value").textContent = `${result} (Typed ${grossCharacters} characters with ${accuracyPercentage}% accuracy)`;

    // After results are displayed, save the stats
    const stats = {
        grossCharacters: parseInt(grossCharacters),
        accuracy: parseFloat(accuracyPercentage),
        grossSpeed: parseFloat(grossSpeed),
        actualSpeed: parseFloat(actualGrossSpeed),
        timeSpent: `${minutesSpent}m ${secondsSpent}s`,
        result: result,
        testId: _tc ? _tc.id : "",
        testName: _tc ? _tc.name : "",
        timestamp: new Date().toISOString(),
        language: localStorage.getItem("selectedExerciseLanguage") || "English",
        exerciseNo: Number(localStorage.getItem("selectedExerciseNo")) || null,
        exerciseTitle: localStorage.getItem("selectedExerciseTitle") || "",
        name: document.getElementById("userName")?.value?.trim()
            || (window.SmartechProfile && window.SmartechProfile.getName())
            || "",
        refNo: document.getElementById("userRefNo")?.value?.trim()
            || (window.SmartechProfile && window.SmartechProfile.getRefNo())
            || ""
    };

    saveTestStats(stats);
    // Also record into the shared progress database used by progress.html
    if (window.SmartechDB) window.SmartechDB.addResult(stats);
}






// Expose submit
window.submitResults = submitResults;
function highlightErrors(defaultWords, typedWords, originalInput, opts) {
    // ---- 1) Recover the actual raw whitespace between each pair of typed words ----
    // (typedWords was produced by splitting on /\s+/, which throws away how many
    // space characters were actually pressed — we need that back to correctly
    // flag double-spacebar presses at their real position, not as one lump sum
    // tacked onto the end of the chunk.)
    const trimmedInput = (originalInput || "").trim();
    const rawTokens = trimmedInput.length > 0 ? trimmedInput.split(/(\s+)/) : [];
    const typedSeparators = [];
    for (let i = 0; i < typedWords.length - 1; i++) {
        typedSeparators.push(rawTokens[2 * i + 1] || " ");
    }

    // ---- 2) Word-level edit-distance alignment (Wagner-Fischer) ----
    // This replaces the old ad-hoc lookahead heuristic. A DP alignment finds the
    // globally-optimal set of matches/substitutions/insertions/deletions, so one
    // typo earlier in the chunk can no longer throw off (desync) detection of
    // errors later in the chunk — every occurrence is found independently.
    const n = defaultWords.length;
    const m = typedWords.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const isMatch = defaultWords[i - 1].toLowerCase() === typedWords[j - 1].toLowerCase();
            dp[i][j] = Math.min(
                dp[i - 1][j - 1] + (isMatch ? 0 : 1), // match / substitute
                dp[i - 1][j] + 1,                      // delete (skipped default word)
                dp[i][j - 1] + 1                       // insert (extra typed word)
            );
        }
    }

    // Backtrack — prefer sub/match, then delete, then insert on ties
    const ops = [];
    let i = n, j = m;
    // Live chunk (Submit / time-over): only the part of the passage the student actually reached
    // is compared. Start the backtrack at the passage prefix that fits the typed words best,
    // instead of at the very end. Starting at the end let a last typed word that was wrong or
    // unfinished pair up with the passage's LAST word (equal cost), which turned every word in
    // between into "skipped" (error characters >> gross characters, negative accuracy).
    // Ties pick the longest prefix so a wrong last word stays a wrong word, not an extra one.
    if (opts && opts.trimUntypedTail && m > 0) {
        let bestI = 0;
        for (let k = 0; k <= n; k++) {
            if (dp[k][m] <= dp[bestI][m]) bestI = k;
        }
        i = bestI;
    }
    while (i > 0 || j > 0) {
        const isMatch = i > 0 && j > 0 && defaultWords[i - 1].toLowerCase() === typedWords[j - 1].toLowerCase();
        if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (isMatch ? 0 : 1)) {
            ops.push({ type: isMatch ? "match" : "sub", defaultWord: defaultWords[i - 1], typedWord: typedWords[j - 1], typedIndex: j - 1 });
            i--; j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
            ops.push({ type: "delete", defaultWord: defaultWords[i - 1] });
            i--;
        } else {
            ops.push({ type: "insert", typedWord: typedWords[j - 1], typedIndex: j - 1 });
            j--;
        }
    }
    ops.reverse();

    // Live chunk (Submit / time-over): everything after the last word the student actually typed
    // was never reached, so it is not "skipped" - even if extra words were typed earlier.
    if (opts && opts.trimUntypedTail) {
        while (ops.length && ops[ops.length - 1].type === "delete") ops.pop();
    }

    // ---- 3) Fold Missing Space / Extra Space (word merge/split) patterns into the alignment ----
    // The DP backtrack can emit these pairs in either order (sub,delete OR
    // delete,sub — and sub,insert OR insert,sub), so both orderings are checked.
    const merged = [];
    for (let k = 0; k < ops.length; k++) {
        const cur = ops[k];
        const next = ops[k + 1];

        // Missing Space: "good"+"morning" typed as one merged word "goodmorning"
        if (
            cur.type === "sub" && next && next.type === "delete" &&
            cur.typedWord.toLowerCase() === (cur.defaultWord + next.defaultWord).toLowerCase()
        ) {
            merged.push({ type: "missingSpace", typedWord: cur.typedWord, defaultWord1: cur.defaultWord, defaultWord2: next.defaultWord, typedIndex: cur.typedIndex });
            k++;
            continue;
        }
        if (
            cur.type === "delete" && next && next.type === "sub" &&
            next.typedWord.toLowerCase() === (cur.defaultWord + next.defaultWord).toLowerCase()
        ) {
            merged.push({ type: "missingSpace", typedWord: next.typedWord, defaultWord1: cur.defaultWord, defaultWord2: next.defaultWord, typedIndex: next.typedIndex });
            k++;
            continue;
        }

        // Extra Space: "today" typed as two separate words "to" "day"
        if (
            cur.type === "sub" && next && next.type === "insert" &&
            cur.defaultWord.toLowerCase() === (cur.typedWord + next.typedWord).toLowerCase()
        ) {
            merged.push({ type: "extraSpace", typedWord1: cur.typedWord, typedWord2: next.typedWord, defaultWord: cur.defaultWord, typedIndex1: cur.typedIndex });
            k++;
            continue;
        }
        if (
            cur.type === "insert" && next && next.type === "sub" &&
            next.defaultWord.toLowerCase() === (cur.typedWord + next.typedWord).toLowerCase()
        ) {
            merged.push({ type: "extraSpace", typedWord1: cur.typedWord, typedWord2: next.typedWord, defaultWord: next.defaultWord, typedIndex1: cur.typedIndex });
            k++;
            continue;
        }

        merged.push(cur);
    }

    // ---- 4) Render ----
    // SPACE_SYMBOL is the visible glyph used to mark a space error inline,
    // always styled red via the "wrong" class (see .space-symbol CSS).
    const SPACE_SYMBOL = "␣";
    let highlightedParagraph = "";
    let extraWordCount = 0;
    let skippedWordCount = 0;

    function checkGapBefore(typedIdx) {
        // Flag every real extra spacebar press right where it happened, using the
        // actual whitespace that preceded this typed word. If the user hit the
        // spacebar 3 times (separator length 3), show 2 symbols — one per extra
        // press beyond the single space that was expected.
        if (typedIdx > 0 && typedSeparators[typedIdx - 1] && typedSeparators[typedIdx - 1].length > 1) {
            const extraPresses = typedSeparators[typedIdx - 1].length - 1;
            for (let s = 0; s < extraPresses; s++) {
                highlightedParagraph += `<span class="space-symbol" data-error-type="space" style="background:transparent;">${SPACE_SYMBOL}</span> `;
            }
        }
    }

    for (const op of merged) {
        if (op.type === "match") {
            checkGapBefore(op.typedIndex);
            highlightedParagraph += `<span class="correct">${op.typedWord}</span> `;
        } else if (op.type === "sub") {
            checkGapBefore(op.typedIndex);
            highlightedParagraph += `<span class="wrong" data-error-type="word">${op.typedWord}</span> <span class="given">${op.defaultWord}</span> `;
        } else if (op.type === "delete") {
            skippedWordCount++;
            highlightedParagraph += `<span class="given" data-error-type="skip" title="Skipped" style="text-decoration: line-through; text-decoration-color: #b80000; text-decoration-thickness: 2px;">${op.defaultWord}</span> `;
        } else if (op.type === "insert") {
            extraWordCount++;
            checkGapBefore(op.typedIndex);
            highlightedParagraph += `<span class="wrong" data-error-type="word" data-extra-word="true" title="Extra word" style="background:transparent; color:inherit; text-decoration: underline; text-decoration-color: #b80000; text-decoration-thickness: 2px;">${op.typedWord}</span> `;
        } else if (op.type === "missingSpace") {
            checkGapBefore(op.typedIndex);
            // Show the joined word itself as the error (in red), split visually
            // at the point the space should have been, then show the correct,
            // properly-spaced form right after.
            const splitPoint = op.defaultWord1.length;
            const typedPart1 = op.typedWord.substring(0, splitPoint);
            const typedPart2 = op.typedWord.substring(splitPoint);
            highlightedParagraph +=
                `<span class="wrong" data-error-type="space" data-typed-length="${op.typedWord.length}">` +
                `${typedPart1}<span class="space-symbol">${SPACE_SYMBOL}</span>${typedPart2}` +
                `</span> <span class="given">${op.defaultWord1} ${op.defaultWord2}</span> `;
        } else if (op.type === "extraSpace") {
            checkGapBefore(op.typedIndex1);
            highlightedParagraph +=
                `<span class="correct">${op.typedWord1}</span>` +
                `<span class="space-symbol" data-error-type="space" style="background:transparent;">${SPACE_SYMBOL}</span>` +
                `<span class="correct">${op.typedWord2}</span> <span class="given">${op.defaultWord}</span> `;
        }
    }

    const wrongWordCount = extraWordCount + skippedWordCount;
    const summaryHTML = `<div class="chunk-word-summary" style="margin-top:8px; padding-top:6px; border-top:1px dashed #ccc; font-size:0.9em; color:#00295f;">
        <b></b> &nbsp; (Extra Typed: ${extraWordCount}, Skipped: ${skippedWordCount})
    </div>`;

    return highlightedParagraph.trim() + summaryHTML;
}
window.highlightErrors = highlightErrors;


// -------------------- Saved stats (localStorage) --------------------
function isLocalStorageAvailable() {
    try {
        const testKey = '__testLocalStorage__';
        localStorage.setItem(testKey, 'test');
        const result = localStorage.getItem(testKey) === 'test';
        localStorage.removeItem(testKey);
        return result;
    } catch (e) {
        return false;
    }
}

// Test history is kept for the last 3 days only (same rule as SmartechDB).
function keepRecentStats(list) {
    if (!Array.isArray(list)) return [];
    if (window.SmartechDB && typeof window.SmartechDB.keepRecent === "function") {
        return window.SmartechDB.keepRecent(list);
    }
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return list.filter(s => { const t = Date.parse(s && s.timestamp); return Number.isFinite(t) && t >= cutoff; });
}

function saveTestStats(stats) {
    try {
        if (!isLocalStorageAvailable()) {
            showLocalStorageError();
            return;
        }
        let savedStats = [];
        try {
            const savedStatsJson = localStorage.getItem('typingTestStats');
            savedStats = savedStatsJson ? JSON.parse(savedStatsJson) : [];
            if (!Array.isArray(savedStats)) savedStats = [];
        } catch (e) {
            savedStats = [];
        }
        savedStats = keepRecentStats(savedStats);
        savedStats.push(stats);
        if (savedStats.length > 200) savedStats.shift();
        localStorage.setItem('typingTestStats', JSON.stringify(savedStats));
        displaySavedStats();
    } catch (error) {
        showLocalStorageError();
    }
}







function showLocalStorageError() {
    const container = $("saved-stats-container") || document.querySelector('.container') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = '<strong>Error:</strong> Unable to save test history locally.';
    container.prepend(errorDiv);
}

function displaySavedStats() {
    if (!isLocalStorageAvailable()) {
        showLocalStorageError();
        return;
    }
    const statsJSON = localStorage.getItem('typingTestStats');
    let allStats = [];
    try { allStats = statsJSON ? JSON.parse(statsJSON) : []; } catch (e) { allStats = []; }
    const savedStats = keepRecentStats(allStats);
    if (Array.isArray(allStats) && savedStats.length !== allStats.length) {
        if (savedStats.length) localStorage.setItem('typingTestStats', JSON.stringify(savedStats));
        else localStorage.removeItem('typingTestStats');
    }
    const statsContainer = $("saved-stats-container");

    if (!statsContainer) return;
    if (!Array.isArray(savedStats) || savedStats.length === 0) {
        statsContainer.innerHTML = '<p>No previous test data available.</p>';
        return;
    }

    let tableHTML = `
        <h3>Your Test History</h3>
        <table class="stats-history-table">
            <thead><tr>
                <th>Date</th><th>Exercise</th><th>Gross Chars / Words</th><th>Accuracy</th><th>Gross Speed</th><th>Actual Speed</th><th>Time</th><th>Result</th>
            </tr></thead><tbody>
    `;

    savedStats.slice().reverse().forEach(stat => {
        const date = new Date(stat.timestamp);
        const formatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
        tableHTML += `<tr>
            <td>${formatted}</td>
            <td>${stat.exerciseNo ? "Ex. " + stat.exerciseNo : "-"}</td>
            <td>${stat.engine === "words" ? stat.typedWords + " words" : stat.grossCharacters}</td>
            <td>${stat.accuracy}%</td>
            <td>${stat.grossSpeed} WPM</td>
            <td>${stat.actualSpeed} WPM</td>
            <td>${stat.timeSpent}</td>
            <td class="${stat.result === 'Pass' ? 'pass-result' : 'fail-result'}">${stat.result}</td>
        </tr>`;
    });

    tableHTML += `</tbody></table>
    <div class="stats-note"><span class="red-asterisk">*</span>Test history from the last 3 days is saved locally in your browser; older results are removed automatically. Clearing cache will also remove history.</div>
    <button id="clear-stats-btn" class="small-btn">Clear History</button>`;

    statsContainer.innerHTML = tableHTML;
    const clearBtn = $("clear-stats-btn");
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your test history?')) {
                localStorage.removeItem('typingTestStats');
                displaySavedStats();
            }
        });
    }
}

// -------------------- Full-screen control binding is done in bindUI above --------------------

/* Exercise label shown in results: "Exercise 3 - English Lesson 3" (or "-" if unknown). */
function smartechExerciseLabel() {
    const no = localStorage.getItem("selectedExerciseNo");
    const title = localStorage.getItem("selectedExerciseTitle");
    if (!no) return "-";
    const t = smartechActiveTest();
    return (t ? t.name + " - " : "") + "Exercise " + no + (title ? " - " + title : "");
}
