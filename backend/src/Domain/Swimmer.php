<?php

declare(strict_types=1);

namespace App\Domain;

final class Swimmer
{
    public function __construct(
        public readonly int $id,
        public string $firstName,
        public string $lastName,
        public string $gender,
        public ?int $yearOfBirth = null,
    ) {
    }
}


