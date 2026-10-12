## Describing the repositories you connect

When a code repository is connected to the product — the engine's `repo add`
or any way the manifest gained the entry — describe it before working on it:
ask the agent to describe the repository, and it follows the set's
`describe-repository` skill — the repository's intended model into the
repository's own model folder with its evidence, the architecture page under
`docs/repositories/<name>/`, the capabilities found in the code as
requirements and use cases marked derived from code, and the decisions found
in the code or its ADRs, each linked to the model elements it shapes. A
repository with uncommitted changes is described only after they are
committed. Every page is written under `docs/`, so the wiki shows it as it
is saved.
