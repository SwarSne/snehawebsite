# Sneha Swaroopa: personal academic website

Built with **Jekyll 4**, deployed to GitHub Pages by GitHub Actions (`.github/workflows/pages.yml`).

Pages (tabs): Home · Research · Publications · Experience · About

## Editing content (no HTML needed)
| File | Holds |
|---|---|
| `_data/publications.yml` | Papers & patents: status (`published`/`accepted`/`review`/`filed`), type, links, summary |
| `_data/research.yml` | Research themes on the Research page (papers attach via `theme`) |
| `_data/experience.yml` | Research & industry roles |
| `_data/education.yml` | Degrees |
| `_data/awards.yml`, `_data/service.yml`, `_data/skills.yml`, `_data/news.yml` | Awards, service, skills, homepage news |

Add a photo: save it as `assets/sneha.jpg` and add `photo: /assets/sneha.jpg` to `_config.yml`.
Add a CV: save the PDF in `assets/` and set `links.cv` in `_config.yml`.

## Run locally
```sh
bundle install
bundle exec jekyll serve --livereload   # http://localhost:4000
```
