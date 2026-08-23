const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('followCount')) {
  schema = schema.replace(
    `  status    String   @default("testing") // testing, active, retired
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}`,
    `  status    String   @default("testing") // testing, active, retired
  weekAdded         String?   // which weekOf it was created from
  adjustmentHistory String?   // JSON: [{date, note, oldWhen, oldThen}]
  followCount       Int       @default(0)
  helpCount         Int       @default(0)
  reviewCount       Int       @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}`
  );
  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('Schema updated');
} else {
  console.log('Schema already updated');
}
