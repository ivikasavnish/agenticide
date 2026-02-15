## Commit Message Template

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
* **feat**: New feature
* **fix**: Bug fix
* **docs**: Documentation
* **style**: Formatting
* **refactor**: Code restructuring  
* **perf**: Performance
* **test**: Tests
* **chore**: Maintenance

### Examples

```
feat(auth): add OAuth2 authentication

Implement OAuth2 flow for Google and GitHub.
Include token refresh and expiry handling.

Closes #123
```

```
fix(security): prevent SQL injection

- Use parameterized queries
- Add input validation
- Update tests

BREAKING CHANGE: User.find() now requires object parameter
```

See CLEAN_CODE_STANDARDS.md for complete guide.
