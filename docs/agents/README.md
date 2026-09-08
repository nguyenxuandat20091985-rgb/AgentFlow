# Isolated AI development workspace

Use Git feature branches named `agent/<agent-id>` for the 18 agents that are not yet production-enabled.

Do not merge their changes directly into `main` while AI Website (`salesbot`) and AI Facebook (`marketing`) are operating.

Production activation is an explicit step: code validation → build/CI → runtime test → heartbeat verification → activation.
