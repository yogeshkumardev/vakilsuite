// Real review route with synthetic data; never contacts providers.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const fixture=JSON.parse(await readFile(new URL('./fixtures/structured-summary.json',import.meta.url)));
const baseline=JSON.parse(await readFile(new URL('./fixtures/baseline.json',import.meta.url)));
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:3101';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try {for(const width of [1366,390]) {
 const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const caseId=baseline.confirm_response.data.document.case_id,runId='11111111-1111-4111-8111-111111111111';let calls=0;
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
  if(url.pathname==='/synthetic-original')return route.fulfill({contentType:'text/plain',body:'Synthetic original'});
  if(!url.pathname.startsWith('/api/v1/'))return route.continue();
  const path=url.pathname.slice(7),ok=data=>route.fulfill({json:{success:true,data}});
  if(['/auth/login','/auth/refresh'].includes(path))return ok({access_token:'synthetic-only',token_type:'bearer',session_id:baseline.session_id,user:baseline.user});
  if(path==='/users/me')return ok(baseline.user);
  if(path==='/chambers')return ok({chambers:[]});
  if(path==='/cases')return ok({cases:[],pagination:{page:1,limit:20,total:0,total_pages:0}});
  if(path.includes('/sources/')){calls++;return ok({url:origin+'/synthetic-original',filename:'Synthetic FIR.pdf',mime_type:'application/pdf',page_number:1,expires_at:'2099-01-01T00:00:00Z'});}
  if(path===`/cases/${caseId}/summary-runs/${runId}`)return ok({id:runId,case_id:caseId,status:'pending_review',result_payload:fixture.payload,presentation:fixture.presentation,result_hash:'synthetic-result',source_manifest_hash:'synthetic-manifest',review_version:0,decisions:[],source_count:1});
  return ok({});
 });
 await page.goto(origin+'/login');await page.locator('input[type=email]').fill(baseline.user.email);await page.locator('input[type=password]').fill('synthetic-password');await page.locator('button[type=submit]').click();await page.waitForURL('**/dashboard');
 await page.goto(`${origin}/cases/${caseId}/summary/${runId}`);await page.getByRole('heading',{name:'01 · Case Overview',exact:true}).waitFor();
 for(const s of fixture.presentation.sections)assert.equal(await page.getByRole('heading',{name:`${String(s.number).padStart(2,'0')} · ${s.title}`,exact:true}).count(),1);
 await page.getByRole('button',{name:'Procedural / Court',exact:true}).click();await page.getByRole('button',{name:'Incident / Factual',exact:true}).click();
 await page.getByRole('button',{name:/Original .* · p\. 1/}).first().click();await page.getByRole('heading',{name:'Synthetic FIR.pdf',exact:true}).waitFor();
 assert.equal(await page.locator('dialog iframe').getAttribute('src'),origin+'/synthetic-original#page=1');await page.getByRole('button',{name:'Close original',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);assert.equal(calls,1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.deepEqual(errors,[]);await context.close();console.log(`Summary smoke passed: ${width}px, 15 sections, timelines, exact original page.`);
}}finally{await browser.close();}
