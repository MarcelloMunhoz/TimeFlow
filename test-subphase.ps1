# Test script to update subphase
$body = @{
    name = "Estudar sobre a empresa - EDITADO"
    description = "Descrição editada para teste"
} | ConvertTo-Json

Write-Host "Testing subphase update..."
Write-Host "Body: $body"

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:5000/api/subphases/31' -Method PATCH -Body $body -ContentType 'application/json'
    Write-Host "Success: $response"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
