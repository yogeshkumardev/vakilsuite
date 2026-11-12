// Synthetic API only: edit/save/approve and drafting gate at desktop and phone widths.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const baseline=JSON.parse(await readFile(new URL('./fixtures/baseline.json',import.meta.url)));
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:3102';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try { for(const width of [1366,390]) {
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('Console:',m.text());});
 const caseId=baseline.confirm_response.data.document.case_id,runId='11111111-1111-4111-8111-111111111111';
 let saves=0,reviews=0;
 const run={id:runId,case_id:caseId,status:'pending_review',created_at:'2026-11-04T00:00:00Z',result_payload:{schema_version:'case-summary-unverified-v1',raw_text:'synthetic incomplete JSON'},editor_recovery_notice:'The saved AI response ended early. Complete missing information before approval.',result_hash:'a'.repeat(64),source_manifest_hash:'b'.repeat(64),review_version:1,decisions:[],source_count:1,review_documents:[],editor_blocks:[{id:'["sections", 0, "findings", 0, "text"]',title:'Executive summary',text:'Original synthetic finding.'}],editor_state:null,has_saved_edits:false};
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
  if(!url.pathname.startsWith('/api/v1/'))return route.continue();
  const path=url.pathname.slice(7),ok=data=>route.fulfill({json:{success:true,data}});
  if(['/auth/login','/auth/refresh'].includes(path))return ok({access_token:'synthetic',token_type:'bearer',session_id:baseline.session_id,user:baseline.user});
  if(path==='/users/me')return ok(baseline.user);
  if(path==='/chambers')return ok([]);
  if(path==='/cases')return ok({cases:[],pagination:{page:1,limit:20,total:0,total_pages:0}});
  if(path.endsWith('/editor')){saves++;const b=route.request().postDataJSON();run.editor_state=b.editor_state;run.review_version++;run.has_saved_edits=true;run.result_payload={output_language:'en-IN',sections:[],uncertainties:[]};run.result_hash='c'.repeat(64);return ok(run);}
  if(path.endsWith('/review')){reviews++;const b=route.request().postDataJSON();assert.equal(b.expected_result_hash,run.result_hash);assert.equal(b.acknowledge_incomplete,true);run.status='completed';return ok(run);}
  if(path===`/cases/${caseId}/summary-runs/${runId}`)return ok(run);
  if(path.endsWith('/summary-runs'))return ok([run]);
  if(path.endsWith('/working-documents'))return ok([]);
  return ok({});
 });
 await page.goto(origin+'/login');await page.locator('input[type=email]').fill(baseline.user.email);await page.locator('input[type=password]').fill('synthetic-password');await page.locator('button[type=submit]').click();await page.waitForURL('**/dashboard');
 await page.goto(`${origin}/cases/${caseId}/summary/${runId}`);
 const editor=page.getByRole('textbox',{name:'Case summary text'});await editor.waitFor({timeout:15000}).catch(async e=>{console.log("UI errors",errors);console.log((await page.locator("body").innerText()).slice(0,6000));await page.screenshot({path:"/tmp/summary-editor-failure.png"});throw e;});
 assert.match(await editor.innerText(),/Original synthetic finding/);
 assert.equal(await page.getByRole('button',{name:'Generate Draft',exact:true}).isDisabled(),true);
 await editor.locator('p').click();await page.keyboard.press('End');await page.keyboard.type(' Lawyer reviewed.');
 await page.getByText('Unsaved changes — save before approval.').waitFor();
 assert.equal(await page.getByRole('button',{name:'Approved',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Changes saved.',{exact:true}).waitFor();
 assert.equal(saves,1);assert.match(JSON.stringify(run.editor_state),/Lawyer reviewed/);
 assert.equal(await page.getByRole('button',{name:'Approved',exact:true}).isDisabled(),true);
 await page.getByRole('checkbox',{name:/I checked all original documents/}).check();
 await page.getByRole('button',{name:'Approved',exact:true}).click();await page.getByRole('link',{name:'Generate Draft',exact:true}).waitFor();assert.equal(reviews,1);
 assert.equal(await editor.getAttribute('contenteditable'),'false');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.deepEqual(errors,[]);
 await page.reload();await page.getByRole('link',{name:'Generate Draft',exact:true}).waitFor();assert.match(await page.getByRole('textbox',{name:'Case summary text'}).innerText(),/Lawyer reviewed/);
 await page.getByRole('link',{name:'Open Drafts',exact:true}).click();await page.getByRole('heading',{name:'Drafts',exact:true}).waitFor();await page.getByRole('link',{name:'Generate Draft',exact:true}).waitFor();
 await page.screenshot({path:`/tmp/summary-drafts-${width}.png`});
 await context.close();console.log(`Summary editor passed: ${width}px edit/save/approve/reload/drafts.`);
}} finally {await browser.close();}
