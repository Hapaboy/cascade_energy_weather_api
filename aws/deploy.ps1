param(
    [string]
    $AwsRegion = "us-west-2",
    [string]
    $StackNamePrefix,
    [string]
    $ApiKey
)

Try {
    $stackName = "$StackNamePrefix-weather-data"
    $repoRoot = (Join-Path $PSScriptRoot ".." -Resolve)

    Push-Location $repoRoot

    # npm install in lambda folders
    # Run typescript
    # Package lambdas

    $awsUser = aws iam get-user
    Write-Host "`nCreating $($stackName) S3 Bucket"
    # aws s3 mb $StackNamePrefix
    aws s3api create-bucket --bucket $StackNamePrefix --region $AwsRegion --create-bucket-configuration LocationConstraint=$AwsRegion

    Write-Host "`nBuilding lambdas..."
    tsc --build tsconfig.json

    Copy-Item ./lambdas/fillQueue/package.json ./dist/fillQueue/package.json -Force
    Copy-Item ./lambdas/processQueue/package.json ./dist/processQueue/package.json -Force

    Write-Host "`nInstalling lambda packages..."
    Set-Location ./dist/fillQueue
    npm install
    Set-Location ../processQueue
    npm install
    Set-Location ../..

    if ((Test-Path ./dist/fillQueue/package.zip -PathType Leaf)) {
        Remove-Item ./dist/fillQueue/package.zip -Force
    }
    if ((Test-Path ./dist/processQueue/package.zip -PathType Leaf)) {
        Remove-Item ./dist/processQueue/package.zip -Force
    }

    Write-Host "`nPackaging lambdas..."
    Compress-Archive ./dist/fillQueue/* ./dist/fillQueue/package.zip
    Compress-Archive ./dist/processQueue/* ./dist/processQueue/package.zip

    Write-Host "`nPackaging stack: $($stackName)"
    sam package -t ./aws/template.yaml --s3-bucket $StackNamePrefix --region $AwsRegion --output-template-file ./aws/package-template.yml

    Write-Host "`nDeploying stack: $($stackName)"
    sam deploy -t ./aws/package-template.yml --stack-name $stackName --region $AwsRegion --capabilities CAPABILITY_IAM --parameter-overrides VISUALCROSSINGAPIKEY=$ApiKey

    # $s3Url = "https://$stackName.s3.$AwsRegion.amazonaws.com/$StackNamePrefix"
    # $stackExists = $true
    # try {
    #    $stackDescription = aws cloudformation describe-stacks --stack-name $stackName
    #    Write-Host $stackDescription
    #    $stackExists = $stackDescription.Stacks[0].Name -eq $stackName
    # }
    # Catch {
    #    $stackExists = $false
    # }

    # Write-Host $stackExists
    # aws cloudformation package --template-file ./aws/template.yaml --region $AwsRegion --s3-bucket $StackNamePrefix --output-template-file ./aws/package-template.yml
    # if ($stackExists) {
    #    Write-Host "`nUpdating stack: $($stackName)"
    #     aws cloudformation update-stack --stack-name $stackName --template-url $s3Url --parameters ParameterKey=VISUALCROSSINGAPIKEY,ParameterValue=$ApiKey --capabilities CAPABILITY_IAM
    # }
    # else {
    #    Write-Host "`nCreating stack: $($stackName)"
    #     aws cloudformation create-stack --stack-name $stackName --template-url $s3Url --parameters ParameterKey=VISUALCROSSINGAPIKEY,ParameterValue=$ApiKey --capabilities CAPABILITY_IAM
    # }

    Pop-Location
}
Catch {
    Write-Error $_
    Pop-Location
}