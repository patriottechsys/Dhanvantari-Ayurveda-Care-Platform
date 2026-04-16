Get-Service | Where-Object { $_.Name -like '*postgres*' } | Format-Table Name, Status, StartType -AutoSize | Out-String
