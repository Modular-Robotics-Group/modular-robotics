# Contributing

Since we provide access to the tools in this repository through the [Modular Robotics Web Tool](https://Modular-Robotics-Group.github.io/modular-robotics/WebVis/index.html), it is important that we make an effort to ensure the version of the tools available online remain functional so that anyone who wants to use them isn't met with an unpleasant surprise when the latest experimental change breaks something important. To this end, the `release` branch only accepts pull requests (no direct commits), and each request needs to be manually reviewed by someone else in the organization. Active development takes place outside of the `release` branch.

## Branches

The `release` branch holds the code responsible for the MRWT website. The `experimental` branch is used for testing new features and fixes. New features should first have their own branch created with `experimental` as the source branch, to reduce the risk of stepping on each others toes. Once a feature has been implemented and tested, it can be merged with `experimental`. If `experimental` seems to be in a functional state (all automated checks pass, no half-implemented features), a pull request to `release` from `experimental` should be made. Changes that do not alter program behavior don't need their own branch, and may be committed directly to `experimental` after checking for regressions.

## To branch or not to branch

In some cases, even if a change does not alter behavior it might be wise to make a separate branch for it. Since other feature branches pull from `experimental` and will consequently suffer from any regressions made in the branch, any sufficiently complex change should get its own branch to reduce the risk of regressions propagating.

## Review

When reviewing pull requests made to the `release` branch, the objective is to ensure MRWT functions as intended. Special care should be taken when reviewing changes made to MRWT HTML or JavaScript. If the WebAssembly for the MRWT Pathfinder has been updated, extensive testing must be done to ensure behavior in MRWT is consistent with our unit tests. Changes which do not affect MRWT should still be reviewed, but less scrutiny is required since it won't affect the website. For example, changes can be made to Pathfinder without affecting the website by simply not compiling the changes to WebAssembly. Another case that does not require too much scrutiny is the addition of a new script or program, since they are entirely separate and don't affect any prior functionality.
