from bs4 import BeautifulSoup
import re
import sys

# Load the HTML file
html_file_path = sys.argv[1]
with open(html_file_path, 'r', encoding='utf-8') as file:
    html_content = file.read()

# Use BeautifulSoup to parse the HTML
soup = BeautifulSoup(html_content, 'html.parser')

# Convert the entire HTML to a string for regex processing
html_str = str(soup)

# Adjusted regular expression to capture content with span tags
diff_pattern = r"<span class=\"ansi31\">\[\-(.*?)\-\]<\/span><span class=\"ansi32\">\{\+(.*?)\+\}<\/span>"

def normalize_text_for_comparison(text):
    # Normalize text for comparison: lowercase, remove non-alphanumeric characters (except whitespace to keep words separate), and then remove extra spaces
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', '', text.lower())).strip()

def is_only_punctuation_change(deletion, addition):
    # Normalize deletion and addition texts for comparison
    deletion_normalized = normalize_text_for_comparison(deletion)
    addition_normalized = normalize_text_for_comparison(addition)
    # Compare normalized strings, ignoring punctuation, case, and additional whitespace
    return deletion_normalized == addition_normalized

# Function to replace matched diff patterns
def replace_diffs(match):
    deletion, addition = match.groups()
    # Normalize addition for output while preserving original formatting as much as possible
    addition_output = normalize_text_for_comparison(addition)
    if is_only_punctuation_change(deletion, addition):
        # Return the 'addition' directly if the difference is only punctuation, wrapped in the appropriate span
        return f"<span class=\"ansi32\">{addition_output}</span>"
    else:
        # Return the original diff markup if not only punctuation changes
        return f"<span class=\"ansi31\">[-{deletion}-]</span><span class=\"ansi32\">{{+{addition}+}}</span>"

# Apply the replacement
modified_html_content = re.sub(diff_pattern, replace_diffs, html_str)

# Write the modified HTML back to a new file
modified_html_file_path = sys.argv[2]
with open(modified_html_file_path, 'w', encoding='utf-8') as file:
    file.write(modified_html_content)

print("Done processing the HTML file.")
