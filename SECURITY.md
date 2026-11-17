# Security Policy

Security and maintainer control are primary design requirements for Tendr. We believe automation should make repositories safer, not expose them to risk.

---

## 🔒 Security Principles & Architectural Guarantees

1. **Least-Privilege Permissions**:
   Tendr requires only the specific permissions needed for its configured tasks:
   ```yaml
   permissions:
     issues: write        # Required for issue labels and triage comments
     pull-requests: write # Required for PR analysis reports and size labels
     contents: read       # Required for reading configs and commit history
   ```
   *Note: `contents: write` is only needed when automating draft release creation in release workflows.*

2. **Zero Execution of Untrusted Code**:
   When using the `pull_request_target` trigger, Tendr **never** checks out, builds, or executes code from the pull request fork. Tendr only inspects repository metadata and file change statistics through GitHub's authenticated REST API.

3. **Untrusted Input Sanitization**:
   All user-supplied text from issues and PR descriptions is treated as completely untrusted:
   - Dynamic regexes are guarded with input length constraints (50,000 characters maximum) to prevent Regular Expression Denial of Service (ReDoS).
   - Text is never passed into shell commands, `eval()`, or unsafe HTML sinks.
   - User handles and mentions are neutralized with zero-width characters before echoing in comments to prevent mass notification harassment.

4. **Token Protection & Secret Masking**:
   The GitHub access token is registered with `core.setSecret()` immediately upon receipt, ensuring it is masked from GitHub Actions logs.

5. **Safe by Default & Never Destructive**:
   Tendr **never** auto-merges, auto-closes, force-pushes, or deletes issues, PRs, or branches. Maintainers always remain in control.

---

## 🛡️ Reporting a Vulnerability

If you discover a potential security vulnerability in Tendr, please report it privately rather than opening a public issue.

- **Private Reporting**: Email the maintainer directly at **`ajmaluk.me@gmail.com`**.
- Please include:
  - Description of the vulnerability
  - Steps or proof-of-concept payload to reproduce
  - Potential impact on repositories using the action

We will acknowledge receipt within 48 hours and work with you on a coordinated fix and advisory release.
