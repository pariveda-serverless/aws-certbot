# aws-certbot

A Slack bot for recording AWS certifications you've earned.

## Pre-reqs

- You have a Slack development workspace
- You've created a new app at https://api.slack.com/apps?new_app=1 in that development workspace
- You've created a slash command at https://api.slack.com/apps/A9ZA995GF/slash-commands? (where 'A9ZA995GF' corresponds to the link for your development workspace)
- The following values will work:

    ``` 
    Command: /aws-cert
    Request URL: http://google.com <- will change once we deploy the function
    Short Description: Log and share the AWS certs you've worked so hard to earn
    Usage Hint: [Validation Number]
    ```
- At 'Oauth & Permissions' click 'Install App to Workspace' (https://api.slack.com/apps/A9ZA995GF/oauth?)
- 

## Contributing

- Fork the repository
- Add cool stuff
- Submit a pull request
- Get credit!


