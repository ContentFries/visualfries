<script lang="ts">
	import { motion } from '../../../src/lib/motion/motion.js';
</script>

<h1 use:motion={{ enter: 'pop', at: 'hit', exit: 'fade', emphasis: 'pulse' }}>Hello</h1>
<p use:motion={{ enter: 'rise', split: 'words', at: 'list' }}>one two three</p>
