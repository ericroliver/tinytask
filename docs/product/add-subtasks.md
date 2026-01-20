
We need to ad two new concepts to tiny task:

First, we need to add the concept of a subtask. Currently, we are only concerned with top level tasks and child tasks though conceptually, we could allow for sub tasks of sub tasks.

We will add a new column named ParentTaskId and a non null ParentTaskID will identity sub tasks.
We already have a concept of the queueName and now we also want to add the concept of assignedTo. Which we may partly already have. 

The important change is that we will need to be able to see tasks and sub tasks that are in a specific queue. and we will want to see tasks/sub tasks assigned to specific agents. 

Here is how it works:

Agent Vaela is a dev
Agent Gaion is a dev
Agent Spartus is product
Agent Daedus is product
Agent Zaeion is QA
Agent Kalaic is QA

Task    Queue   Agent
1       dev     Vaela
2       dev     unassigned
3       product Spartus
4       product unassigned
5       product Daedus
6       qa      Zaeion
7       qa      unassigned
8       qa      unassigned

We can see who is assigned what and that we have an available dev and QA not working and that we have dev and QA tasks that need to be assigned. All of this happens in another application because of the data and functions that tinytask allows.

We will likely need to extend the tools and perhaps additional tools. Please study what we have and come up with a plan to make these changes.