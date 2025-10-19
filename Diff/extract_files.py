# D:\NeurixPlay\Diff\extract_files.py
import re
import os

# 👇 Define the REPO ROOT (parent of this 'Diff' folder)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Path to the markdown file (after applying patch)
MARKDOWN_PATH = os.path.join(REPO_ROOT, "server", "NEW_DIFF_DROPINS.md")

if not os.path.exists(MARKDOWN_PATH):
    print(f"❌ Error: {MARKDOWN_PATH} not found.")
    print("👉 Did you run 'git apply new_diff.patch' from the repo root first?")
    exit(1)

with open(MARKDOWN_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Split by file headers like "## `server/src/index.ts`"
sections = re.split(r"^## `([^`]+)`", content, flags=re.MULTILINE)

if len(sections) < 2:
    print("❌ No file sections found in markdown.")
    exit(1)

# sections[0] = intro text, then [1]=path, [2]=content, [3]=path, [4]=content, ...
for i in range(1, len(sections), 2):
    filepath = sections[i].strip()
    block = sections[i + 1]

    # Extract first code block (```lang\n...\n```)
    code_match = re.search(r"```(?:\w+)?\n(.*?)\n```", block, re.DOTALL)
    if not code_match:
        print(f"⚠️  No code block found for {filepath}")
        continue

    code = code_match.group(1).rstrip()  # Remove trailing newline
    full_output_path = os.path.join(REPO_ROOT, filepath.replace("/", os.sep))

    # Create parent directories
    os.makedirs(os.path.dirname(full_output_path), exist_ok=True)

    # Write the clean code
    with open(full_output_path, "w", encoding="utf-8") as out:
        out.write(code)

    print(f"✅ Written: {full_output_path}")

print("\n✨ Done! All files extracted to the repo.")