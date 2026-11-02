import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from core import identity

class ContextServiceTests(unittest.TestCase):
    def test_restart_and_project_isolation(self):
        with tempfile.TemporaryDirectory() as root:
            def call(**request):
                p=subprocess.run([sys.executable,str(Path(__file__).with_name('context_service.py')),root],input=json.dumps(request),capture_output=True,text=True,timeout=10)
                self.assertEqual(p.returncode,0,p.stderr)
                return json.loads(p.stdout)
            a,b=identity(),identity()
            saved=call(operation='save',project=a,title='Git decision',text='Use feature branches')
            self.assertTrue(saved['ok'])
            self.assertIn('feature branches',json.dumps(call(operation='context',project=a,text='Git decision')))
            self.assertNotIn('feature branches',json.dumps(call(operation='context',project=b,text='Git decision')))
            self.assertFalse(call(operation='list',project='../escape')['ok'])
            self.assertFalse(call(operation='list',project=a,root='other')['ok'])
            self.assertFalse(call(operation='execute',project=a)['ok'])
            self.assertTrue(call(operation='list',project=a)['ok'])
            self.assertEqual(len(call(operation='list',project=a)['value']),1)

    def test_edit_disable_delete_and_stale_update(self):
        from context_service import handle
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);project=identity()
            def call(operation,**fields):
                return handle(root,dict(operation=operation,project=project,**fields))
            old=call('save',title='Git workflow',text='Use main branch')
            edited=call('update',entity=old['entity'],revision=old['id'],title='Git workflow',text='Use feature branches',status='confirmed')
            self.assertIn('feature branches',json.dumps(call('context',text='Git workflow')))
            with self.assertRaises(ValueError):
                call('update',entity=old['entity'],revision=old['id'],text='stale edit')
            disabled=call('update',entity=edited['entity'],revision=edited['id'],title='Git workflow',text='Use feature branches',status='outdated')
            self.assertEqual(call('context',text='Git workflow')['sources'],[])
            self.assertEqual(len(call('list')),1)
            call('delete',entity=disabled['entity'],revision=disabled['id'])
            self.assertEqual(call('list'),[])
            self.assertEqual(call('context',text='Git workflow')['sources'],[])

    def test_memory_references_include_exact_revision_and_credentials_are_rejected(self):
        from context_service import handle
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);project=identity()
            first=handle(root,dict(operation='save',project=project,title='Git workflow',text='Use feature branches'))
            context=handle(root,dict(operation='context',project=project,text='Git workflow'))
            self.assertEqual(context['source_records'][0]['revision'],first['id'])
            with self.assertRaisesRegex(ValueError,'Credentials'):
                handle(root,dict(operation='save',project=project,title='secret',text='password=synthetic-secret'))
            records=handle(root,dict(operation='list',project=project))
            self.assertEqual(len(records),1)

    def test_concurrent_memory_updates_cannot_both_overwrite_the_same_revision(self):
        from context_service import handle
        from concurrent.futures import ThreadPoolExecutor
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);project=identity()
            record=handle(root,dict(operation='save',project=project,title='decision',text='original'))
            def update(index):
                try:
                    handle(root,dict(operation='update',project=project,entity=record['entity'],revision=record['id'],title='decision',text='change '+str(index)))
                    return True
                except ValueError:
                    return False
            with ThreadPoolExecutor(max_workers=8) as pool:
                results=list(pool.map(update,range(8)))
            self.assertEqual(sum(results),1)
            records=handle(root,dict(operation='list',project=project))
            self.assertEqual(len(records),1)
            self.assertFalse(records[0]['conflict'])

if __name__=='__main__':
    unittest.main()
