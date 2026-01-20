# Subtask Management
tinytask subtask create 7 "Design schema" -a alice
tinytask subtask tree 7 --recursive
tinytask subtask move 10 7

# Queue Management  
tinytask queue list
tinytask queue stats dev
tinytask queue tasks dev --status idle
tinytask queue move 5 qa

# Enhanced Task Commands
tinytask task create "Fix bug" --queue dev --parent 5
tinytask task update 10 --parent null
tinytask task list --queue dev --exclude-subtasks
