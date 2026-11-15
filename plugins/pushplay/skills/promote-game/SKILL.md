---
name: promote-game
description: Move a finished game out of this workshop (games/<id>) into its own public GitHub repo, so it can be listed on PushPlay's Discover tab and get its own releases, while players keep their saves. Use when the user says a game is "ready", "done", wants to "promote", "publish", "release", "put it on Discover", "give it its own repo" or "move it out".
---

# Promote a game

Promoting is for a **workshop**: a repo with many games in `games/<id>/`, so one agent session can make and prototype any number of them. (A repo with one game at its root already has its own repo; there's nothing to promote.) A finished game moves into **its own repo** (one game per repo), which is what PushPlay's Discover tab and Studio expect. `pushplay promote <id>` does the work; this skill covers the decisions and the two ways to run it. `pushplay` is the command the `pushplay-rules` skill gives you.

What promoting does:
1. Checks the game (`pushplay check <id>`).
2. Makes the new repo: the game's files at the root, the one workflow file that builds it (`.github/workflows/pushplay.yml`), a short README, and `"movedFrom": "<this repo>"` in `pushplay.json`. Nothing else is added.
3. Creates the repo (public by default), pushes it, and adds the `pushplay-game` topic. The first push builds and publishes the game.
4. Removes `games/<id>` from the workshop and commits that.

Players don't lose anything: the launcher sees `movedFrom` and moves its tile to the new repo, keeping saves, play time and favorites. The player adds the new repo the same way as any other (Add game → Connect GitHub, then pick it in My repositories).

## 1. Confirm
- The user has played it and calls it ready. Read `games/<id>/DESIGN.md` and mention unticked Definition of done items in one line; they don't block promoting.
- Ask once only for what isn't known: the **repo name** (default: the game id, under the same owner as this repo) and **public or private** (public by default; only public repos can be listed on Discover).

## 2. Run it (pick what this environment can do)

**A. On a computer with `gh` signed in** (Claude Code locally):
```sh
pushplay promote <id>                        # creates owner/<id>, public
pushplay promote <id> --repo owner/name   # another name; --private, --keep (leave a copy here)
git push                                    # pushes the removal from the workshop
```

**B. A cloud agent without `gh`, with a GitHub connector that can create repos:** build the folder, then create and push with the connector:
```sh
pushplay promote <id> --no-create --out ../<name>
```
Create the empty repo with the connector (for example `create_repository`, public, no auto-init), give this session push access to it if your environment needs that (for example `add_repo` with push access), then `git -C ../<name> remote add origin https://github.com/<owner>/<name>.git && git -C ../<name> push -u origin main`. Then `git rm -r -q games/<id> && git commit -m "<Name>: moved to <owner>/<name>"` and push. Never push the game to any repo other than the one just created.

## 3. Verify
- The new repo's build run goes green and its `pushplay-latest` release has `<id>-web.zip` (the first push builds everything).
- This workshop no longer has `games/<id>`, and that commit is pushed.

## 4. Hand back
Tell the user:
- the new repo URL, and that **future work on the game happens there**: open a new agent session on that repo
- in PushPlay: Add game → Connect GitHub, pick the new repo in My repositories (or Paste repo URL); their saves carry over
- to list it on Discover, connect the repo in Studio
- new ideas still start here, in the workshop: "make a game where…"
