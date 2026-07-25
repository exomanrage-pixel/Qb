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

    // Save payload to local storage so the target Google Site page can read it across tabs
    const payload = {
        titles: titlesArray,
        content: sharedContent,
        currentIndex: 0
    };

    localStorage.setItem('gs_automation_payload', JSON.stringify(payload));
    localStorage.setItem('gs_automation_active', 'true');

    statusLog.textContent = `Status: Opening Google Sites editor to process ${titlesArray.length} items...`;

    // Open a blank Google Site creation page
    const targetWindow = window.open('https://sites.google.com/u/0/new', '_blank');

    // Inject automated watcher script loop once user arrives at the editor
    const checkInterval = setInterval(() => {
        if (!targetWindow || targetWindow.closed) {
            clearInterval(checkInterval);
            return;
        }
        
        try {
            if (targetWindow.location.href.includes('sites.google.com/d/')) {
                statusLog.textContent = "Status: Google Site editor detected. Running automation tasks...";
                
                // Inject the runner payload handler inside the target window
                targetWindow.eval(`
                    (function() {
                        if (window.hasRunAutomation) return;
                        window.hasRunAutomation = true;

                        let data = JSON.parse(localStorage.getItem('gs_automation_payload'));
                        if (!data || data.currentIndex >= data.titles.length) {
                            console.log("Automation sequence completed.");
                            return;
                        }

                        let currentTitle = data.titles[data.currentIndex];
                        console.log("Processing Title: " + currentTitle);

                        // 1. Fill Title Field
                        let titleBox = document.querySelector('[aria-label="Page title"]');
                        if (titleBox) {
                            titleBox.focus();
                            document.execCommand('selectAll', false, null);
                            document.execCommand('insertText', false, currentTitle);
                        }

                        // 2. Click "Text box" element in sidebar
                        let divs = document.querySelectorAll('div');
                        for (let el of divs) {
                            if (el.textContent.trim() === 'Text box' && el.offsetParent !== null) {
                                el.click();
                                break;
                            }
                        }

                        // 3. Insert Body Content and Publish
                        setTimeout(() => {
                            let editableFields = document.querySelectorAll('[contenteditable="true"]');
                            let latestField = editableFields[editableFields.length - 1];
                            if (latestField) {
                                latestField.focus();
                                document.execCommand('insertText', false, data.content);
                            }

                            setTimeout(() => {
                                let publishBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === 'Publish' && el.offsetParent !== null);
                                if (publishBtn) {
                                    publishBtn.click();
                                    
                                    // Increment index for next loop or item
                                    data.currentIndex++;
                                    localStorage.setItem('gs_automation_payload', JSON.stringify(data));
                                }
                            }, 1000);
                        }, 1000);
                    })();
                `);
            }
        } catch (e) {
            // Cross-origin safety boundary notice handling silently during navigation redirects
        }
    }, 2000);
});