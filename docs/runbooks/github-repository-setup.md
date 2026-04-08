# GitHub Repository Setup

This is the recommended GitHub setup for Shapewebs before connecting the platform to Vercel.

## Recommended repository model

Use **one private GitHub repository** inside your GitHub organization.

Recommended repository name:

- `shapewebs-platform`

Do **not** create separate repositories for `web` and `admin`.

Why:

- the codebase is already a monorepo
- Vercel supports multiple projects from one monorepo
- one repository keeps migrations, shared packages, docs, and apps together
- one repository is easier to protect, back up, and maintain

## Final Git + Vercel shape

- GitHub organization
  - one private repository: `shapewebs-platform`
- Vercel team
  - one project for `apps/web`
  - one project for `apps/admin`

## Important plan note

If your organization is on **GitHub Free**, a private repository will **not** get the full private-repo branch protection stack.

GitHub's current docs say:

- **rulesets** for private repositories require **GitHub Pro, GitHub Team, or GitHub Enterprise Cloud**
- **protected branches** for private repositories also require **GitHub Pro, GitHub Team, or GitHub Enterprise Cloud**

For a serious production platform, the best GitHub setup is:

- GitHub organization on **GitHub Team**
- one **private** repository inside that organization

If you stay on GitHub Free for now, you can still create the repository and turn on access/security features, but the branch protection layer for the private repo will be weaker.

## Before creating the repository

### 1. Secure your GitHub account

Before you upload any code:

- enable GitHub 2FA on your own account
- use a strong password or a passkey
- save your GitHub recovery codes somewhere safe

### 2. Secure the GitHub organization

In the GitHub organization settings, configure these first:

- require 2FA for the organization
- require **secure** 2FA methods if that option is available
- restrict repository creation so members cannot accidentally create public repositories
- keep the organization small for now
- install apps only on selected repositories, not all repositories, whenever possible
- keep private repository forking disabled

Recommended path in the current GitHub UI:

- `Organization -> Settings -> Security -> Authentication security`
  - enable `Require two-factor authentication for everyone in your organization`
  - enable `Only allow secure two-factor methods`
- `Organization -> Settings -> Access -> Member privileges`
  - keep repository forking disabled
  - restrict repository creation as tightly as your plan allows
  - if available, restrict visibility changes to organization owners only

### 3. Decide repository visibility

Create the repository as:

- `Private`

That is the correct setting for this platform at this stage because the repo contains:

- deployment configuration
- infrastructure code
- Supabase migrations
- internal admin code

## Create the repository in GitHub

Inside your GitHub organization:

1. Click `New repository`
2. Owner: choose your organization
3. Repository name: `shapewebs-platform`
4. Visibility: `Private`
5. Do **not** add:
   - README
   - `.gitignore`
   - license
6. Create repository

Important:

- leaving README and `.gitignore` unchecked avoids merge noise because the local repo already has those files

## Protect the repository before first push

After the repository is created, open its settings and configure these.

## Repository settings checklist

Use the repository's `Settings` page and work through these sections in order.

### 1. General

Recommended settings:

- keep the repository **Private**
- keep the default branch as `main`
- enable **auto-delete head branches**
- enable **squash merge**
- disable **merge commits**
- disable **rebase merge**
- leave **auto-merge** off until CI exists

Feature toggles:

- keep **Issues** on
- turn **Discussions** off unless you know you want them
- turn **Wiki** off
- turn **Projects** off at the repository level unless you plan to use repository-scoped projects

Why:

- squash-only history is easier to audit in a solo product repo
- disabling wiki/discussions reduces extra surfaces you are not using yet
- keeping issues on is still useful for your own backlog if you want it

### 2. Collaborators & teams

Recommended settings:

- only you should have `Admin` access right now
- do not add outside collaborators unless absolutely necessary
- if you later add people, prefer organization teams over direct individual repo grants
- use the lowest role that works

For now, the cleanest setup is:

- you as the only admin
- no one else with write access

### 3. Forking

For a private production repo, keep forking **disabled** unless you have a specific reason to allow it.

If the setting is visible in:

- `Settings -> General` or `Settings -> Features`

then leave `Allow forking` unchecked.

### 4. Advanced Security

Go to:

- `Settings -> Security -> Advanced Security`

Enable these if available:

- `Dependency graph`
- `Dependabot alerts`
- `Dependabot security updates`

If your plan includes them, also enable:

- `Secret Protection`
- `Secret scanning`
- `Push protection`
- `Code Security`

If `Code Security` is available, use default setup first rather than building a custom CodeQL setup immediately.

### 5. Rules / Rulesets

If you are on **GitHub Team or higher**, create an **Active branch ruleset** targeting `main`.

Recommended day-one rules:

- target branch: `main`
- enforcement: `Active`
- block deletions
- block force pushes
- require linear history
- require a pull request before merging

Recommended bypass:

- repository admins only

Do **not** require approvals or required status checks yet unless CI is already in place. Otherwise you can lock yourself out of normal work for no benefit.

Once CI exists, come back and add:

- require status checks to pass before merging
- require conversation resolution before merging

If you are **not** on GitHub Team or higher, note this limitation in your launch checklist and upgrade before the production hardening pass.

### 6. Actions

Go to:

- `Settings -> Actions -> General`

Recommended settings:

- keep GitHub Actions enabled
- allow only:
  - actions created by GitHub
  - verified creator actions
  - actions and reusable workflows in this repository
- set default `GITHUB_TOKEN` permissions to **Read repository contents and packages**
- keep `Allow GitHub Actions to create and approve pull requests` **off**

Why:

- Vercel deployments do not require you to give broad Actions permissions
- read-only default token permissions are the safer default

### 7. Access review

After the repo is created and after each integration install:

- review `Collaborators & teams`
- review installed GitHub Apps
- remove anything with broader access than needed

For Vercel specifically:

- install the Vercel GitHub app on **Only select repositories**
- grant it access only to `shapewebs-platform`

### General repository security

Under GitHub repository settings, enable these where available:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning, if your plan includes it
- Push protection, if your plan includes it

These features help catch:

- vulnerable dependencies
- accidentally committed secrets
- future supply-chain issues

### Branch protection / ruleset

Create a branch ruleset for `main`.

Recommended initial rules:

- block force pushes
- block branch deletion
- require linear history
- require pull request before merge
- require status checks later, once CI is in place

For right now, as a solo builder, the minimum responsible protection is:

- no force push to `main`
- no deleting `main`
- linear history
- pull requests for merges

Once CI exists, tighten `main` further.

## Install the Vercel GitHub app carefully

When you later connect Vercel to GitHub:

- install the Vercel GitHub app on the organization
- choose **Only select repositories**
- grant access only to `shapewebs-platform`

Do not give Vercel access to every repository in the organization unless you actually need that.

## Local checks before upload

This repository is already configured to avoid pushing local secrets:

- `.env*` is ignored in [.gitignore](/Users/lukasthomsen/Desktop/shapewebs_1.1/.gitignore)
- local env files should stay untracked

Before you push, verify:

```bash
git status --short
git check-ignore -v apps/web/.env.local apps/admin/.env.local
```

The env files should be ignored and should **not** appear as tracked files.

## Upload the existing local repository

After the GitHub repository exists, use one of these remote styles.

### Recommended: SSH

Use SSH if you want the most reliable long-term workflow.

If you do not already have an SSH key:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Then add the public key to GitHub.

The remote will look like:

```bash
git remote add origin git@github.com:YOUR_ORG/shapewebs-platform.git
```

### Simpler: HTTPS

Use HTTPS if you want the quickest setup and are okay authenticating through the browser or a credential manager.

The remote will look like:

```bash
git remote add origin https://github.com/YOUR_ORG/shapewebs-platform.git
```

## First push commands

From the repo root:

```bash
git status
git add .
git commit -m "Restructure Shapewebs into platform monorepo"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/shapewebs-platform.git
git push -u origin main
```

If you prefer HTTPS, replace the remote URL with the HTTPS version.

## After the first push

Verify in GitHub:

- repository is private
- `main` exists
- branch ruleset is active
- no `.env.local` files were uploaded
- no secrets are visible in the code
- Dependabot and dependency graph are enabled

Only after that should you move on to:

- importing the repo into Vercel
- creating the `shapewebs-web` project
- creating the `shapewebs-admin` project

## Recommended first checkpoint

The cleanest next milestone is:

- GitHub repository created
- remote added locally
- first push completed

After that, connect the single GitHub repository to Vercel and create the two Vercel projects from the same monorepo.
