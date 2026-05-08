# Contributing to Lunara 🚀

Welcome! We're excited you want to contribute to Lunara. This guide will walk you through everything you need to know, from your first issue to getting your code merged.

## 📋 Table of Contents

1. [Before You Start](#before-you-start)
2. [Ways to Contribute](#ways-to-contribute)
3. [Setting Up Your Development Environment](#setting-up-your-development-environment)
4. [Finding Issues to Work On](#finding-issues-to-work-on)
5. [How to Report Issues](#how-to-report-issues)
6. [How to Request Features](#how-to-request-features)
7. [Making Code Changes](#making-code-changes)
8. [Testing Your Changes](#testing-your-changes)
9. [Submitting a Pull Request](#submitting-a-pull-request)
10. [Code Review Process](#code-review-process)
11. [Getting Help](#getting-help)

---

## 🎯 Before You Start

### Prerequisites
- Basic knowledge of Python and/or JavaScript
- Familiarity with Git and GitHub
- A text editor (VS Code recommended)
- About 30 minutes to set up

### What You'll Need
- **Python 3.11+** for backend development
- **Node.js 18+** for frontend development
- **MongoDB** (local or Atlas account)
- **Git** installed on your machine

---

## 🤝 Ways to Contribute

| Type | Description | Time Commitment |
|------|-------------|-----------------|
| 🐛 **Bug Reports** | Find and report issues | 5-15 minutes |
| 💡 **Feature Ideas** | Suggest new functionality | 10-20 minutes |
| 📝 **Documentation** | Improve docs, wiki, README | 30-60 minutes |
| 🧪 **Testing** | Write or improve tests | 1-2 hours |
| 💻 **Code** | Fix bugs or implement features | 2-8 hours |

**Beginner-friendly:** Start with documentation or bug reports!

---

## 🛠️ Setting Up Your Development Environment

### Step 1: Fork the Repository

1. Go to https://github.com/Amrit-raj50/Lunara
2. Click the **"Fork"** button (top right)
3. Choose your GitHub account

### Step 2: Clone Your Fork

```bash
# Replace YOUR_USERNAME with your GitHub username
git clone https://github.com/YOUR_USERNAME/Lunara.git
cd Lunara
```

### Step 3: Set Up Upstream Remote

```bash
# This lets you sync with the original repo
git remote add upstream https://github.com/Amrit-raj50/Lunara.git
git fetch upstream
```

### Step 4: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your MongoDB URI
```

### Step 5: Frontend Setup

```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Step 6: Run Everything

```bash
# Terminal 1: Start backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit http://localhost:5173 - you should see Lunara running! 🎉

---

## 🔍 Finding Issues to Work On

### For Beginners
Look for issues with these labels:
- `good first issue` - Perfect for newcomers
- `documentation` - No coding required
- `help wanted` - Community collaboration needed

### How to Find Issues

1. Go to the [Issues tab](https://github.com/Amrit-raj50/Lunara/issues)
2. Use filters: `is:open is:issue label:"good first issue"`
3. Read the issue description carefully
4. Comment: "I'd like to work on this!" before starting

### Issue Priority
- 🔴 **High**: Critical bugs, security issues
- 🟡 **Medium**: Feature requests, improvements
- 🟢 **Low**: Documentation, minor fixes

---

## 🐛 How to Report Issues

### Before Reporting
1. **Check existing issues** - Search to avoid duplicates
2. **Try the latest version** - Your issue might be fixed
3. **Check the wiki** - Solution might already exist

### Creating a Bug Report

Use the **"Bug Report"** template and include:

#### Required Information
- **Clear title**: "Audio enhancement fails on MP4 files with specific codec"
- **Steps to reproduce**: Exact steps to trigger the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Python/Node versions, browser

#### Helpful Information
- Screenshots or screen recordings
- Error messages (full text)
- Sample files (if applicable)
- Console logs

#### Example Bug Report
```markdown
**Title:** Noise reduction crashes on files > 100MB

**Steps:**
1. Upload a 150MB MP4 file
2. Set noise reduction to 80%
3. Click "Process"
4. Application crashes

**Expected:** File processes successfully
**Actual:** Shows "Internal Server Error"

**Environment:**
- OS: Windows 11
- Python: 3.11.5
- Browser: Chrome 120
```

---

## 💡 How to Request Features

### Before Requesting
1. **Search existing issues** - Avoid duplicates
2. **Check the roadmap** - See if it's already planned
3. **Consider the scope** - Is it realistic for this project?

### Creating a Feature Request

Use the **"Feature Request"** template and include:

#### Required Information
- **Clear title**: "Add support for WebM video format"
- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Use cases**: Who would use this and why?

#### Optional but Helpful
- Mockups or screenshots
- Alternative approaches considered
- Implementation ideas (if technical)

#### Example Feature Request
```markdown
**Title:** Add support for WebM video format

**Problem:** Currently only MP4 is supported, but WebM is popular for web content

**Proposed Solution:**
- Add WebM to file upload validation
- Update FFmpeg processing to handle WebM
- Test with various WebM codecs

**Use Cases:**
- Content creators using WebM for smaller file sizes
- Web developers needing WebM output
- Users with WebM source files
```

---

## 💻 Making Code Changes

### Step 1: Create a Branch

```bash
# Always create a new branch for your work
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### Branch Naming Convention
- `feature/audio-enhancement` - New features
- `fix/123-noise-reduction-crash` - Bug fixes (include issue number)
- `docs/readme-update` - Documentation changes
- `refactor/api-cleanup` - Code refactoring

### Step 2: Understand the Codebase

#### Backend Structure
```
backend/
├── main.py              # FastAPI routes and endpoints
├── audio_processor.py   # Audio enhancement logic
├── render.py            # Video rendering and NLE
├── template.py          # Data models (Pydantic)
├── captions.py          # Whisper transcription
└── thumbnail.py         # Thumbnail generation
```

#### Frontend Structure
```
frontend/src/
├── App.jsx              # Main application component
├── Workflows.jsx        # Template builder and batch render
├── NLETimeline.jsx      # Timeline editor component
└── apiConfig.js         # API configuration
```

### Step 3: Make Your Changes

#### Backend Development
- Follow PEP 8 style guidelines
- Add type hints to function signatures
- Include docstrings for new functions
- Handle errors gracefully

```python
# Example: Adding a new audio filter
def apply_reverb_filter(audio_data: np.ndarray, strength: float) -> np.ndarray:
    """
    Apply reverb effect to audio data.
    
    Args:
        audio_data: Input audio array
        strength: Reverb intensity (0.0 to 1.0)
    
    Returns:
        Processed audio array with reverb
    """
    # Your implementation here
    pass
```

#### Frontend Development
- Use functional components with hooks
- Follow existing component patterns
- Add PropTypes or JSDoc comments
- Ensure responsive design

```jsx
// Example: Adding a new control component
function ReverbControl({ strength, onChange }) {
  return (
    <div className="control-group">
      <label>Reverb</label>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={strength}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
    </div>
  );
}
```

### Step 4: Commit Your Changes

#### Commit Message Format
```
type(scope): subject

body (optional)

footer (optional)
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code formatting (no functional change)
- `refactor`: Code improvement
- `test`: Adding or improving tests
- `chore`: Maintenance tasks

#### Examples
```bash
# Good commit messages
git commit -m "feat(audio): add reverb filter to audio processor"
git commit -m "fix(ui): resolve crash when no file is uploaded"
git commit -m "docs(readme): update installation instructions for Windows"

# Bad commit messages
git commit -m "fixed stuff"
git commit -m "update"
git commit -m "wip"
```

---

## 🧪 Testing Your Changes

### Backend Testing

#### Manual Testing
1. Start the backend: `uvicorn main:app --reload`
2. Test your changes via the frontend or API
3. Check for errors in the terminal
4. Test edge cases (empty inputs, large files, etc.)

#### Automated Testing (if applicable)
```bash
# Run existing tests
cd backend
pytest

# Add new tests for your feature
# Create test files in tests/ directory
```

### Frontend Testing

#### Manual Testing
1. Start the frontend: `npm run dev`
2. Test your changes in the browser
3. Check browser console for errors
4. Test on different screen sizes (responsive)
5. Test with different browsers if possible

#### Common Issues to Test
- File upload with various formats
- Network errors and timeouts
- Large file handling
- Browser compatibility

### Before Submitting
- [ ] Code follows style guidelines
- [ ] No console errors
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Documentation updated (if needed)

---

## 📤 Submitting a Pull Request

### Step 1: Sync with Upstream

```bash
# Get latest changes from main repo
git fetch upstream
git rebase upstream/main
```

### Step 2: Push Your Changes

```bash
# Push to your fork
git push origin your-branch-name
```

### Step 3: Create Pull Request

1. Go to your fork on GitHub
2. Click **"New Pull Request"**
3. Ensure base is `main` and compare is your branch
4. Fill out the PR template

### Pull Request Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring
- [ ] Other

## Testing
- [ ] Tested manually
- [ ] Added automated tests
- [ ] Tested edge cases

## Screenshots (if applicable)
Add screenshots to show your changes.

## Additional Notes
Any additional context or considerations.
```

### Step 4: Wait for Review

Maintainers will review your PR and provide feedback. This usually takes 1-3 days.

---

## 🔍 Code Review Process

### What Reviewers Look For
- **Functionality**: Does it work correctly?
- **Code Quality**: Is it well-written and maintainable?
- **Performance**: Will it impact performance negatively?
- **Security**: Are there any security concerns?
- **Documentation**: Is it properly documented?

### Common Review Comments
- "Can you add error handling here?"
- "Consider using a more descriptive variable name"
- "Please add tests for this function"
- "This could be simplified by..."

### Responding to Reviews
- Be open to feedback
- Ask questions if you don't understand
- Make requested changes promptly
- Thank reviewers for their time

### Getting Approved
Once approved, a maintainer will merge your PR. Congratulations! 🎉

---

## 🆘 Getting Help

### Where to Ask
- **GitHub Discussions**: General questions and help
- **Issues**: Bug reports and feature requests
- **Discord** (if available): Real-time chat

### Before Asking for Help
1. **Search existing issues and discussions**
2. **Check the wiki** and documentation
3. **Try to solve it yourself first**
4. **Gather relevant information** (error messages, steps to reproduce)

### How to Ask for Help Effectively

#### Good Help Request
```markdown
**Problem:** I'm trying to add a new audio filter but getting an error

**What I tried:**
1. Added function to audio_processor.py
2. Updated the API endpoint
3. Got this error: "AttributeError: module has no attribute 'apply_reverb'"

**Code snippet:**
```python
def apply_reverb_filter(audio_data, strength):
    # my code here
```

**Environment:**
- Python 3.11.5
- Windows 11
- Latest main branch

**Question:** What am I missing to make this work?
```

#### Bad Help Request
```markdown
"my code doesn't work help"
```

---

## 🎉 Congratulations!

You've made it through the contribution guide! Here's what you've learned:

- ✅ How to set up your development environment
- ✅ How to find and report issues
- ✅ How to make code changes
- ✅ How to test your work
- ✅ How to submit a pull request

### Next Steps
1. **Start small** - Try documentation or a simple bug fix
2. **Ask questions** - The community is here to help
3. **Learn from others** - Read existing PRs and issues
4. **Be patient** - Open source moves at its own pace

### Recognition
All contributors are recognized in:
- The repository's contributors list
- Release notes (for significant contributions)
- Our hearts (thank you! 💜)

---

## 📚 Additional Resources

- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [Python Style Guide (PEP 8)](https://peps.python.org/pep-0008/)
- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## 📞 Contact

If you have questions about contributing:
- Create a discussion in the repository
- Mention @Amrit-raj50 in an issue
- Check the wiki for additional resources

**Happy contributing! 🚀**
