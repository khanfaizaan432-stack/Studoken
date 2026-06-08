# 🧬 Spectral Chromatin Coiler (SCC)

A privacy-first, zero-dependency Chrome Extension that compresses Large Language Model (LLM) prompts by up to 60% entirely client-side. 

By running native graph-matrix algorithms locally in the browser, SCC eliminates the need for expensive GPU-backed compression servers, saving API tokens and bypassing rate limits without sacrificing core academic context.

## ⚠️ The Problem
Standard text compression algorithms (like Gzip) output binary that LLM tokenizers cannot read. Meanwhile, state-of-the-art AI compression tools (like LLMLingua) require expensive cloud GPUs to calculate token perplexity and often fragment words, degrading the LLM's reasoning ability. 

## 🚀 The Solution: A Hybrid Architecture
SCC solves this by moving the heavy computation to the client's CPU and operating at the sentence and syntax level, rather than the token level. It utilizes a two-phase architecture inspired by DNA packaging:

### Phase 1: Spectral Selection (The Math)
1. **Adjacency Matrix:** Parses unstructured text and builds a 2D stochastic matrix representing cosine similarities between sentences (Bag-of-Words).
2. **Power Iteration Method:** Runs a dependency-free matrix convergence loop to calculate the principal eigenvector, assigning a mathematical centrality score to every sentence.

### Phase 2: Biological Coiling (The Linguistic Filter)
Instead of blindly deleting low-scoring text, the algorithm categorizes sentences:
* **Exons (Top Tier):** High-scoring sentences are preserved perfectly intact to anchor the LLM's contextual understanding.
* **Introns (Lower Tier):** Low-scoring sentences are "coiled." A custom regex filter strips structural stop words (is, the, of, are) while retaining the core nouns, verbs, and technical keywords. 

**The Result:** A highly dense, chronological natural language stream that drastically reduces token counts without triggering Byte-Pair Encoding (BPE) fragmentation.

## 🛠️ Features
* **Zero Infrastructure Cost:** 100% of the $O(N^2)$ matrix math runs on the local browser via native JavaScript.
* **Privacy Native:** Your lecture notes, unpublished research, and transcripts never leave your device.
* **Frictionless DOM Injection:** Automatically locates React/Next.js input fields on `claude.ai` and `chatgpt.com`, injects the compressed payload, and triggers native submit events.
* **Manifest V3 Compliant:** Built to modern Chrome security and service worker standards.

## 📦 Installation (Developer Mode)
Since this is an active developer build, you can install it directly from the source code:

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** on in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the folder containing the repository files (`manifest.json`, `popup.html`, `popup.js`, `content.js`).
6. Pin the extension to your toolbar for easy access!

## 💻 Usage
1. Open a tab to [Claude](https://claude.ai) or [ChatGPT](https://chatgpt.com).
2. Click the 🧬 SCC extension icon in your toolbar.
3. Paste your massive block of text (lecture transcript, essay, code documentation) into the input box.
4. Adjust the **Exon retention** slider (0.5 means the top 50% of sentences remain perfectly intact, while the rest are coiled).
5. Click **Compress & Inject**. 
6. The extension will calculate the token savings and instantly drop the optimized prompt into your chat window.

## 🏗️ Tech Stack
* **Frontend UI:** HTML5, CSS3
* **Logic Engine:** Vanilla JavaScript (Zero external math/NLP dependencies)
* **Architecture:** Chrome Extension API (Manifest V3, Content Scripts, ActiveTab Messaging)

---
*Built to optimize study workflows and demonstrate practical systems engineering constraints.*
