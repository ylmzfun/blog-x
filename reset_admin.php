<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::find(1);
$user->password = \Illuminate\Support\Facades\Hash::make('password');
$user->role = 'admin';
$user->save();

echo "Admin password reset to: password\n";
echo "User: {$user->name} ({$user->email}), role: {$user->role}\n";
