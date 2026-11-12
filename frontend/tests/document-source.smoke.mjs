// Synthetic end-to-end source lifecycle: never calls storage or a model.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const baseline=JSON.parse(await readFile(new URL('./fixtures/baseline.json',import.meta.url)));
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:3000';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const document=baseline.confirm_response.data.document;
const editorDoc=text=>({schemaVersion:1,pageLayout:{size:'A4',orientation:'portrait',margins:{top:25.4,bottom:25.4,left:25.4,right:25.4}},editorState:{root:{type:'root',version:1,direction:null,format:'',indent:0,children:[{type:'source-page',version:1,pageNumber:1,direction:null,format:'',indent:0,children:[{type:'paragraph',version:1,direction:null,format:'',indent:0,children:text?[{type:'text',version:1,text,detail:0,format:0,mode:'normal',style:''}]:[]}]}]}}});
const widths=(process.env.TEST_WIDTHS||'1440,768,390').split(',').map(Number);
assert.ok(widths.every(width=>[1440,768,390].includes(width)));
try {for(const width of widths) {
 const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source={file_version_id:'66666666-6666-4666-8666-666666666666',source_sha256:'a'.repeat(64),mode:'needs_review',pages:[{page_number:1,text:'',native:false,reason:'scanned_document'}],page_count:1,editor_version:1,editor_document:editorDoc(''),ocr_status:null,ocr_can_retry:false};
 let failLoad=true, failPoll=false, submitCount=0, failSave=true, saveCount=0, sourceInspectionCount=0, statusPollCount=0;
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
  if(url.pathname==='/synthetic-original')return route.fulfill({contentType:'text/html',body:'<p>Synthetic original</p>'});
  if(!url.pathname.startsWith('/api/v1/'))return route.continue();
  const path=url.pathname.slice(7),ok=data=>route.fulfill({json:{success:true,data}}),fail=status=>route.fulfill({status,json:{success:false,error:{code:'TEST_FAILURE',message:'PRIVATE DIAGNOSTIC MUST NOT DISPLAY'}}});
  if(['/auth/login','/auth/refresh'].includes(path))return ok({access_token:'synthetic-only',token_type:'bearer',session_id:baseline.session_id,user:baseline.user});
  if(path==='/users/me')return ok(baseline.user);
  if(path==='/chambers')return ok([]);
  if(path==='/cases')return ok({cases:[],pagination:{page:1,limit:20,total:0,total_pages:0}});
  if(path===`/cases/${document.case_id}/permissions`)return ok({can_edit:true,can_read:true});
  if(path===`/documents/${document.id}`)return ok({document});
  if(path.endsWith('/view-url'))return ok({url:origin+'/synthetic-original',expires_at:'2099-01-01T00:00:00Z'});
  if(path.endsWith('/summary-source')){sourceInspectionCount++;return failLoad?fail(429):ok(source);}
  if(path.endsWith('/ocr-status')){statusPollCount++;return failPoll?fail(429):ok({status:source.ocr_status,error:null,can_restart:false,can_retry:false,retry_may_charge:false,attempt_count:0});}
  if(path.endsWith('/ocr-quote'))return ok({quote_hash:'quote'});
  if(path.endsWith('/ocr')){submitCount++;source={...source,ocr_status:'queued'};return ok({status:'queued'});}
  if(path.endsWith('/editor')){saveCount++;if(failSave)return fail(503);const body=route.request().postDataJSON();assert.equal(body.expected_editor_version,source.editor_version);source={...source,editor_document:body.editor_document,editor_version:source.editor_version+1};return ok(source);}
  if(path.endsWith('/editor-review')){const body=route.request().postDataJSON();assert.equal(body.expected_editor_version,source.editor_version);assert.equal(body.confirmed,true);source={...source,mode:'reviewed',editor_version:source.editor_version+1};return ok(source);}
  return ok({});
 });
 await page.goto(origin+'/login');await page.locator('input[type=email]').fill(baseline.user.email);await page.locator('input[type=password]').fill('synthetic-password');await page.locator('button[type=submit]').click();await page.waitForURL('**/dashboard');
 await page.goto(`${origin}/cases/${document.case_id}/documents/${document.id}`);
 try { await page.getByRole('button',{name:'Retry text workspace'}).waitFor(); } catch(e) { console.log('page:', await page.locator('body').innerText()); console.log('page errors:',errors); throw e; }
 assert.equal(await page.getByText('We couldn’t open this document. Please try again.').count(),0);
 await page.getByRole('region',{name:'Notifications'}).getByText(/Processing is busy/).waitFor();
 failLoad=false;await page.getByRole('button',{name:'Retry text workspace'}).click();
 await page.getByRole('button',{name:'Type this document',exact:true}).click();
 await page.getByText(/Waiting for the typing service/).waitFor();assert.equal(submitCount,1);
 await page.waitForTimeout(3000);assert.equal(sourceInspectionCount,2);assert.ok(statusPollCount>=1);
 failPoll=true;await page.getByText(/Reconnecting to document status/).waitFor({timeout:15000});assert.equal(sourceInspectionCount,2);
 assert.equal(await page.getByRole('tab',{name:'Text editor',exact:true}).count(),1);
 failPoll=false;source={...source,ocr_status:'succeeded',editor_version:2,editor_document:editorDoc('Typed Hindi text: बयान 123')};
 const editor=page.locator('[contenteditable="true"]');await editor.waitFor({timeout:20000});await page.getByText('Typed Hindi text: बयान 123',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Print document',exact:true}).waitFor();
 assert.equal(await page.getByRole('tab',{name:'Export',exact:true}).count(),0);
 while(await page.getByRole('button',{name:'Dismiss notification',exact:true}).count())await page.getByRole('button',{name:'Dismiss notification',exact:true}).first().click();
 if(width===1440)await page.getByRole('button',{name:'Side by side',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Align Center',exact:true}).isVisible(),true);
 assert.equal(await page.getByRole('button',{name:'Bold (Ctrl+B)',exact:true}).isVisible(),true);
 assert.equal(await page.locator('.editor-home-panel').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
 await editor.press('Control+End');await page.keyboard.insertText(' Advocate correction');await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Mark whole document reviewed',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Assign page to selected text',exact:true}).count(),0);
 assert.ok((await editor.textContent()).includes('Advocate correction'));
 failSave=false;await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.getByText('Text saved. Review it against the original before confirming.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Mark whole document reviewed',exact:true}).click();await page.getByText('Reviewed text is ready for the case summary.',{exact:true}).waitFor();
 assert.ok(saveCount>=2);assert.equal(submitCount,1);assert.equal(sourceInspectionCount,3);assert.equal(await page.getByText('PRIVATE DIAGNOSTIC MUST NOT DISPLAY').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:`/tmp/vakilsuite-source-${width}.png`,fullPage:true});
 source={...source,mode:'direct_pdf',pages:[],editor_document:null};await page.reload();await page.getByText(/Digital PDF · Original will be read directly/).waitFor();assert.equal(await page.getByRole('button',{name:'Type this document',exact:true}).count(),0);
 await page.goto(origin+'/missing-synthetic-page');await page.getByRole('heading',{name:'Let’s find your work'}).waitFor();
 assert.deepEqual(errors,[]);await context.close();console.log(`Source smoke passed: ${width}px, recovery, queue, OCR text, failed-save retry, review, digital original, 404.`);
}}finally{await browser.close();}
