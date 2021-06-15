# Cascade Energy Weather API

Retrieves weather data for all required locations on a daily basis. 
This system supports in-flight data transformations and the ability to trace 
data back to the source.

# Deploying
From Powershell run `.\aws\deploy.ps1 -StackNamePrefix cascade-energy -ApiKey <apikey>` from the root directory of the repo

# Questions
- Is there a list of locations I am required to use?
- - There is a set list (it does change) but for the purposes of this task I can choose
- What does the old data look like?
- - The data is time series data: timestamp, location, temp with values of humidity etc
- Should the data collection schedule be automated or will it be triggered manually?
- - Automated