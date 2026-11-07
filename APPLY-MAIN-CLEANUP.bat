@echo off
setlocal
pushd "%~dp0"
set "ROOT="
for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "ROOT=%%R"
if not defined ROOT (
  echo ERROR: Extract this ZIP into the root of your SajSaathi Main Git repository.
  echo The folder must contain the .git directory and package.json.
  pause
  exit /b 1
)

git -C "%ROOT%" apply --check "%~dp0SajSaathi-MAIN-CLEANUP.patch"
if errorlevel 1 (
  echo ERROR: The patch could not be applied cleanly.
  echo Check whether these routes were already removed or locally modified.
  pause
  exit /b 1
)

git -C "%ROOT%" apply "%~dp0SajSaathi-MAIN-CLEANUP.patch"
if errorlevel 1 (
  echo ERROR: Git reported a problem while applying the patch.
  pause
  exit /b 1
)

echo SUCCESS: Removed obsolete Partner-only routes from the Main repository.
echo Review the changes, then commit and push them to GitHub.
pause
popd
