document.getElementById('executeBtn').addEventListener('click', () => {
    const sharedContent = document.getElementById('sharedContent').value.trim();
    const rawTitles = document.getElementById('titlesInput').value.trim();
    const statusLog = document.getElementById('statusLog');

    if (!sharedContent || !rawTitles) {
        alert("Please fill in both the common body content and at least one title.");
        return;
    }

    const titlesArray = rawTitles.split('\n').map(t => t.trim()).filter(t => t.length > 0);

    if (titlesArray.length === 0) {
        alert("No valid titles found.");
        return;
    }

    // Save payload to localStorage so it persists across page reloads and new tabs
    const payload = {
        titles: titlesArray,
        content: sharedContent,
        currentIndex: 0
    };

    localStorage.setItem('gs_automation_payload', JSON.stringify(payload));

    statusLog.textContent = `Status: Opening Google Sites editor to process ${titlesArray.length} items...`;

    // Open a blank Google Site editor tab
    const targetWindow = window.open('https://sites.google.com/u/0/new', '_blank');

    // Continuous loop watcher to handle title filling, body insertion, and publishing page-by-page
    const checkInterval = setInterval(() => {
        if (!targetWindow || targetWindow.closed) {
            clearInterval(checkInterval);
            return;
        }
        
        try {
            if (targetWindow.location.href.includes('sites.google.com/d/')) {
                statusLog.textContent = "Status: Google Site editor active. Running full automation loop...";
                
                targetWindow.eval(`
                    (function() {
                        let data = JSON.parse(localStorage.getItem('gs_automation_payload'));
                        if (!data || data.currentIndex >= data.titles.length) {
                            console.log("All batch items successfully processed!");
                            return;
                        }

                        let currentTitle = data.titles[data.currentIndex];
                        console.log("Processing item " + (data.currentIndex + 1) + ": " + currentTitle);

                        // 1. Fill Page Title
                        let titleBox = document.querySelector('[aria-label="Page title"]');
                        if (titleBox && titleBox.textContent !== currentTitle) {
                            titleBox.focus();
                            document.execCommand('selectAll', false, null);
                            document.execCommand('insertText', false, currentTitle);
                        }

                        // 2. Click "Text box" in the right sidebar
                        let divs = document.querySelectorAll('div');
                        for (let el of divs) {
                            if (el.textContent.trim() === 'Text box' && el.offsetParent !== null) {
                                el.click();
                                break;
                            }
                        }

                        // 3. Insert Shared Body Content and click Publish
                        setTimeout(() => {
                            let editableFields = document.querySelectorAll('[contenteditable="true"]');
                            let latestField = editableFields[editableFields.length - 1];
                            if (latestField && !latestField.textContent.includes(data.content)) {
                                latestField.focus();
                                document.execCommand('insertText', false, data.content);
                            }

                            setTimeout(() => {
                                let publishBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === 'Publish' && el.offsetParent !== null);
                                if (publishBtn) {
                                    publishBtn.click();
                                    
                                    // Move to next index
                                    data.currentIndex++;
                                    localStorage.setItem('gs_automation_payload', JSON.stringify(data));
                                    
                                    // Handle final publish dialog click inside the modal if it pops up
                                    setTimeout(() => {
                                        let modalPublish = Array.from(document.querySelectorAll('button')).reverse().find(el => el.textContent.trim() === 'Publish' && el.offsetParent !== null);
                                        if (modalPublish) {
                                            modalPublish.click();
                                        }
                                    }, 1500);
                                }
                            }, 1500);
                        }, 1500);
                    })();
                `);
            }
        } catch (e) {
            // Handles browser frame navigation safety securely
        }
    }, 3000);
});
