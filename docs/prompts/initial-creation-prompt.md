I need a node/type script model context protocol application that can manage tasks for a team of LLM agents. The system should run as a docker container and can use SQlLite for storage. We will map the container storage to the docker host for persistence across restarts. The task system needs to support:
1. Tasks - Full maintenance (CRUD)
2. Tasks can have 0 to many links.. simple table to hold the link path
3. Tasks can have 0 to many comments.. 
4. Tasks have a status: idle, working, complete
5. Tasks can be assigned to agents (effectively making it an agent queue). We will need the agent to be able query it's queue. We will not enforce name validation. An agent named 'agent1' queries for open (idle, working) tasks assigned to the name 'agent1'. agent1 can assign the task to any name and it should work. A human will be monitoring queues and reassign as needed.
6. LLMs need to be able to perform CRUD on comments and links.. As LLMs create new artifacts, they will add a link. LLMS will make prodigious use of comments.
7. At the end of a workflow, an agent will also move the artifacts, comments, links etc. to the production ticket system. Once the workflow is complete, the task is archived but no longer needed for operations.

What we are after is the minimum viable application that facilitate a teams of agents working a task in collaboration. So the task might start in a product agent, then move to an architect agent, then back to product for story genreation, then to a github agent to create the issues, then to a code agent, then to a reviewer, then qa, etc, etc, etc. 

The task moves across various agent queues (the system prompts tell agents their queue and how to make decisions on where it should go next.) until it is complete.