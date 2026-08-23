const fs = require('fs');
let content = fs.readFileSync('app/app/journal/page.tsx', 'utf8');

if (!content.includes('const [page, setPage] = useState(1)')) {
  // Insert state
  content = content.replace(
    'const [isImportOpen, setIsImportOpen] = useState(false)',
    'const [isImportOpen, setIsImportOpen] = useState(false)\n  const [page, setPage] = useState(1)\n  const perPage = 50'
  );
  
  // When filters change, reset page
  content = content.replace(
    'onChange={e => setSearchQuery(e.target.value)}',
    'onChange={e => { setSearchQuery(e.target.value); setPage(1); }}'
  );
  content = content.replace(
    'onChange={e => setFilterPlaybook(e.target.value)}',
    'onChange={e => { setFilterPlaybook(e.target.value); setPage(1); }}'
  );
  content = content.replace(
    'onChange={e => setFilterInstrument(e.target.value)}',
    'onChange={e => { setFilterInstrument(e.target.value); setPage(1); }}'
  );

  // Slice filtered trades
  content = content.replace(
    '{filteredTrades.map(trade => {',
    `{filteredTrades.slice((page - 1) * perPage, page * perPage).map(trade => {`
  );

  // Add pagination controls
  const paginationUI = `
          <div className="flex items-center justify-between mt-4 px-2">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filteredTrades.length)} of {filteredTrades.length} trades
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * perPage >= filteredTrades.length} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
  `;
  content = content.replace(
    '</TableBody>\n            </Table>',
    `</TableBody>\n            </Table>${paginationUI}`
  );

  fs.writeFileSync('app/app/journal/page.tsx', content, 'utf8');
  console.log('Added pagination to journal page');
}
