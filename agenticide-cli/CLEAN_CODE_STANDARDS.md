# Clean Code & Security Standards

## 📏 Code Quality Standards

### Function Guidelines
- **Maximum 50 lines per function**
  - Single Responsibility Principle
  - If longer, break into smaller functions
  - Each function should do ONE thing well

- **Cyclomatic Complexity ≤ 10**
  - Reduce nested conditionals
  - Extract complex logic into helper functions
  - Use early returns to reduce nesting

- **Maximum 4 parameters**
  - Use object destructuring for multiple parameters
  - Consider options object pattern
  - Example: `function(options)` instead of `function(a, b, c, d, e)`

- **Maximum 300 lines per file**
  - Split large files into logical modules
  - One class/module per file (ideally)

### Code Examples

#### ❌ Bad - Too Long, Too Complex
```javascript
function processUser(name, email, age, address, phone, role, permissions, settings) {
    if (name) {
        if (email) {
            if (age > 18) {
                if (address) {
                    if (phone) {
                        if (role === 'admin') {
                            if (permissions.includes('write')) {
                                // ... 40 more lines
                            }
                        }
                    }
                }
            }
        }
    }
}
```

#### ✅ Good - Clean, Focused
```javascript
function processUser(options) {
    const validation = validateUser(options);
    if (!validation.valid) return validation.error;
    
    const user = createUserObject(options);
    const permissions = calculatePermissions(user);
    
    return saveUser(user, permissions);
}

function validateUser({ name, email, age }) {
    if (!name) return { valid: false, error: 'Name required' };
    if (!email) return { valid: false, error: 'Email required' };
    if (age < 18) return { valid: false, error: 'Must be 18+' };
    return { valid: true };
}
```

## 🔒 OWASP Security Standards

### Top 10 Security Checks

#### 1. Injection Prevention
```javascript
// ❌ BAD - SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD - Parameterized Query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

#### 2. Authentication & Secrets
```javascript
// ❌ BAD - Hardcoded Credentials
const apiKey = 'sk-1234567890abcdef';
const password = 'admin123';

// ✅ GOOD - Environment Variables
const apiKey = process.env.API_KEY;
const password = process.env.DB_PASSWORD;
```

#### 3. Sensitive Data Exposure
```javascript
// ❌ BAD - Logging Sensitive Data
console.log('User password:', user.password);
console.log('API Key:', apiKey);

// ✅ GOOD - Sanitized Logging
console.log('User login:', user.email);
console.log('API Key:', apiKey ? '***' : 'missing');
```

#### 4. XML External Entities (XXE)
```javascript
// ❌ BAD - Unsafe XML Parsing
const parser = new DOMParser();
const doc = parser.parseFromString(xmlString);

// ✅ GOOD - Disable External Entities
const parser = new DOMParser();
parser.setFeature('http://xml.org/sax/features/external-general-entities', false);
```

#### 5. Access Control
```javascript
// ❌ BAD - No Authorization Check
router.delete('/users/:id', async (req, res) => {
    await User.delete(req.params.id);
});

// ✅ GOOD - Authorization Middleware
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
    await User.delete(req.params.id);
});
```

#### 6. Security Misconfiguration
```javascript
// ❌ BAD - Debug Enabled
app.set('debug', true);
app.use(cors({ origin: '*' }));

// ✅ GOOD - Secure Configuration
app.set('debug', process.env.NODE_ENV === 'development');
app.use(cors({ origin: process.env.ALLOWED_ORIGINS.split(',') }));
```

#### 7. Cross-Site Scripting (XSS)
```javascript
// ❌ BAD - Unsafe HTML
element.innerHTML = userInput;
React: dangerouslySetInnerHTML={{ __html: userInput }}

// ✅ GOOD - Safe Rendering
element.textContent = userInput;
React: {userInput} // Auto-escaped
```

#### 8. Insecure Deserialization
```javascript
// ❌ BAD - Eval is Evil
eval(userInput);
new Function(userInput)();

// ✅ GOOD - Safe Parsing
JSON.parse(userInput);
```

#### 9. Using Components with Known Vulnerabilities
```bash
# Run security audit
npm audit
npm audit fix

# Or with Bun
bun audit
```

#### 10. Insufficient Logging & Monitoring
```javascript
// ❌ BAD - Silent Failure
try {
    await riskyOperation();
} catch (error) {
    // Nothing
}

// ✅ GOOD - Log Errors
try {
    await riskyOperation();
} catch (error) {
    logger.error('Operation failed', {
        error: error.message,
        stack: error.stack,
        user: req.user.id,
        timestamp: new Date()
    });
    throw error;
}
```

## 🎯 Commit Standards

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semi-colons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintain

### Examples
```
feat(auth): add OAuth2 authentication

- Implement OAuth2 flow
- Add Google and GitHub providers
- Include token refresh logic

Closes #123
```

```
fix(security): prevent SQL injection in user query

- Use parameterized queries
- Add input validation
- Update tests

BREAKING CHANGE: User.find() now requires object parameter
```

## 📋 PR (Pull Request) Standards

### PR Template
```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] Code follows style guidelines
- [ ] Functions < 50 lines
- [ ] Cyclomatic complexity < 10
- [ ] No hardcoded secrets
- [ ] Security scan passed
- [ ] Tests pass
- [ ] Documentation updated

## Security Considerations
List any security implications

## Screenshots (if applicable)
Add screenshots for UI changes
```

### PR Review Checklist
- ✅ Code quality (complexity, length)
- ✅ Security (OWASP checks)
- ✅ Tests (coverage, quality)
- ✅ Documentation
- ✅ Performance
- ✅ Breaking changes noted

## 🔧 Automated Checks

### Pre-commit Hook
```json
{
  "hooks": {
    "pre-commit": [
      {
        "name": "quality-check",
        "type": "command",
        "command": "node scripts/quality-check.js",
        "blocking": true,
        "onError": "fail"
      },
      {
        "name": "security-scan",
        "type": "command",
        "command": "node scripts/security-scan.js",
        "blocking": true,
        "onError": "fail"
      },
      {
        "name": "lint",
        "type": "command",
        "command": "eslint .",
        "blocking": true,
        "onError": "fail"
      }
    ]
  }
}
```

### ESLint Configuration
```json
{
  "rules": {
    "max-lines-per-function": ["error", 50],
    "complexity": ["error", 10],
    "max-params": ["error", 4],
    "max-lines": ["warn", 300],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error"
  }
}
```

## 📊 Metrics to Track

- **Code Quality**
  - Average function length
  - Average cyclomatic complexity
  - Code coverage

- **Security**
  - Known vulnerabilities
  - Security audit score
  - Time to patch

- **Maintainability**
  - Technical debt ratio
  - Code duplication
  - Documentation coverage

## 🎓 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Clean Code by Robert Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**These standards ensure code is secure, maintainable, and PR-friendly!**
