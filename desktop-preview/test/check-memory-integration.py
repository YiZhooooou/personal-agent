import json,subprocess,tempfile
from pathlib import Path
cli=Path(__file__).resolve().parents[1]/'dist'/'tasks.cjs'
with tempfile.TemporaryDirectory() as root:
 def call(command,*args,request=None):
  p=subprocess.run(['node',str(cli),command,root,*args],input=json.dumps(request) if request else None,capture_output=True,text=True,encoding="utf-8",timeout=20)
  assert p.returncode==0,p.stderr
  return json.loads(p.stdout)
 a=call('project',request={'operation':'create','name':'A'})['projectId'];b=call('project',request={'operation':'create','name':'B'})['projectId']
 call('project',request={'operation':'memory','action':'save','id':a,'title':'Git workflow','text':'Git workflow uses feature branches'})
 context=call('project',request={'operation':'input','id':a,'text':'Git workflow'})
 assert context['memories']['sources']
 assert 'feature branches' in json.dumps(context)
 assert call('project',request={'operation':'input','id':b,'text':'Git workflow'})['memories'] is None
 task=call('submit','Git workflow','memory-check',a)
 assert 'feature branches' in task['context_json']
 memory=call('project',request={'operation':'memory','action':'list','id':a})[0]
 call('project',request={'operation':'memory','action':'delete','id':a,'entity':memory['entity'],'revision':memory['id']})
 assert call('project',request={'operation':'input','id':a,'text':'Git workflow'})['memories']['sources']==[]
 assert 'feature branches' in call('show',task['id'])['context_json']
 print('PASS: packaged memory process via Node CLI, source retrieval, project isolation, task snapshot')
