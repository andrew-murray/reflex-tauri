import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import CssBaseline from '@mui/material/CssBaseline';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailIcon from '@mui/icons-material/Mail';
import { styled, useTheme} from '@mui/material/styles';
import FolderIcon from '@mui/icons-material/Folder';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Box from '@mui/material/Box';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import React from 'react'
import {pathsep} from "./defs"
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const SAMPLE_PRODUCTS = [
  {
    id: 'grid',
    label: 'Data Grid',
    children: [
      { id: 'grid-community', label: '@mui/x-data-grid' },
      { id: 'grid-pro', label: '@mui/x-data-grid-pro' },
      { id: 'grid-premium', label: '@mui/x-data-grid-premium' },
    ],
  },
  {
    id: 'pickers',
    label: 'Date and Time Pickers',
    children: [
      { id: 'pickers-community', label: '@mui/x-date-pickers' },
      { id: 'pickers-pro', label: '@mui/x-date-pickers-pro' },
    ],
  },
  {
    id: 'charts',
    label: 'Charts',
    children: [{ id: 'charts-community', label: '@mui/x-charts' }],
  },
  {
    id: 'tree-view',
    label: 'Tree View',
    children: [{ id: 'tree-view-community', label: '@mui/x-tree-view' }],
  },
];

function TreeView({treeData, multiSelect, checkboxSelection, onSelectedItemsChange, selectedItems})
{
    return <Box sx={{ minHeight: 352, minWidth: 250, maxHeight: "50vh", overflowY: "auto"}}>
      <RichTreeView 
        items={treeData ?? SAMPLE_PRODUCTS} 
        multiSelect={multiSelect ?? undefined}
        checkboxSelection={checkboxSelection ?? undefined}
        // note: we don't pass selectedItems,
        // which means it's a controlled prop of the TreeView
        // and starts with every unselected
        onSelectedItemsChange={onSelectedItemsChange}
        selectedItems={selectedItems}
      />
    </Box>
}

const drawerWidth = 420;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  minHeight: 48,
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': openedMixin(theme),
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': closedMixin(theme),
        },
      },
    ],
  }),
);

const createNodeFromCache = (fullPath, relPath, queryCache) =>
{
  let baseElement = {
    id: fullPath,
    label: relPath
  };
  const childrenFromCache = queryCache[fullPath];
  if (childrenFromCache.length !== 0) // && childrenFromCache !== undefined
  {
    let children = [];
    for (const childRelPath of childrenFromCache)
    {
      const childFullPath = fullPath + pathsep + childRelPath;
      children.push(createNodeFromCache(
        childFullPath,
        childRelPath,
        queryCache
      ));
    }
    baseElement.children = children;
  }
  return baseElement;
}

function NavDrawer({
  folderData, 
  open,
  handleDrawerClose,
  handleDrawerOpen,
  selectedFolders,
  onSelectFolders,
  selectedFilesystem,
  onSelectFilesystem
})
{
  const theme = useTheme();
  const lightroomFolderActive = selectedFolders.length > 0;
  const filesystemActive = selectedFilesystem.length > 0;
  const treeDataForFolders = React.useMemo(
    ()=>{
      let tree = [];
      for(const folder of folderData.folders)
      {
        tree.push({
          id: folder,
          label: folder,
          children: []
        });
      }
      return tree;
    },
    [folderData]
  );
  const treeDataForFilesystem = React.useMemo(
    ()=>{
      let tree = [];
      const queryCache = folderData.filesystemQueryCache;
      const filesystemLevels = folderData.filesystem;
      // if we haven't populated this at all, guess an empty tree?
      if("0" in filesystemLevels)
      {
        // the filesystemLevels keys are strings and may not come out in order ... 
        // do some awkward stuff as we need to process 0, 1, 2 ... 
        for(const root of filesystemLevels["0"])
        {
          // at depth zero, absPath === relPath
          // todo: can we skip the redundant paths?
          // if D:/photos/albums is the base path to all files, can we avoid showing D: and D:/photos
          tree.push(createNodeFromCache(root, root, queryCache));
        }
      }
      return tree;
    },
    [folderData]
  );

  const mkListItem = ({active, text, onClick, Component}) => {
    return <ListItem 
      key={text} 
      disablePadding 
      sx={{ display: 'block', minHeight: 48}} >
        <Paper>
          <div style={active ? {backgroundColor: theme.palette.primary.main} : undefined}>
            <ListItemButton onClick={onClick}>
              <ListItemIcon
                sx={[
                  {
                    minWidth: 0,
                    justifyContent: 'center',
                  },
                  open
                    ? {
                        mr: 3,
                      }
                    : {
                        mr: 'auto',
                      },
                ]}
              >
                <Component />
              </ListItemIcon>
              <ListItemText
                primary={text}
                sx={[
                  open
                    ? {
                        opacity: 1,
                      }
                    : {
                        opacity: 0,
                      },
                ]}
              />
            </ListItemButton>
            </div>
        </Paper>
    </ListItem>
  };

  const mkAccordionItem = ({active, text, onClick, Component}, index) => {
    return <ListItem key={text} disablePadding sx={{ display: 'block' }} style={{maxWidth: "100%"}}>
      <Accordion style={{maxWidth: "100%", backgroundColor: active ? theme.palette.primary.main: undefined}} >
          <AccordionSummary
              expandIcon={
                <ArrowDropDownIcon/>
              }
              aria-controls="panel2-content"
              id="panel2-header"
            >
              <ListItemIcon
                sx={[
                  {
                    minWidth: 0,
                    justifyContent: 'center',
                  },
                  open
                    ? {
                        mr: 3,
                      }
                    : {
                        mr: 'auto',
                      },
                ]}
              >
                <Component />
              </ListItemIcon>
              <Typography component="span">{text}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper>
                <TreeView 
                  treeData={index === 0 ? treeDataForFolders : treeDataForFilesystem}
                  multiSelect={index === 0 ? true: false}
                  checkboxSelection={index === 0? true: false}
                  onSelectedItemsChange={
                    index === 0 ? onSelectFolders : onSelectFilesystem
                  }
                  active={active}
                  selectedItems={index === 0 ? selectedFolders : selectedFilesystem}
                />
              </Paper>
            </AccordionDetails>
      </Accordion>
    </ListItem>
  };

  // fixme: the second drawer
  // "snaps in" and animates out from the side, rather than
  // animating out, as if it were an extension of the first
  // onClick={open ? handleDrawerClose : handleDrawerOpen}>
  const buttonElements = [
    {
      text: 'Lightroom Folder',
      active: lightroomFolderActive,
      Component: () => <FolderIcon />,
      onClick: handleDrawerOpen
    },
    {
      text: 'Filesystem',
      active: filesystemActive,
      Component: () => <InsertDriveFileIcon />,
      onClick: handleDrawerOpen
    }
  ];
  const menuElements = [
    {
      text: 'Open',
      active: false,
      Component: () => { return ((theme.direction === 'rtl') ^ open) ?  <ChevronLeftIcon /> : <ChevronRightIcon />;},
      onClick: open ? handleDrawerClose : handleDrawerOpen
    }
  ];

  return <StyledDrawer variant="permanent" open={open}>
    {open && 
      <DrawerHeader>
        <div style={{flexGrow: 1}} />
        <IconButton onClick={open ? handleDrawerClose : handleDrawerOpen}>
          {((theme.direction === 'rtl') ^ open) ?  <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </DrawerHeader>
    }
      {!open && 
         <List style={{maxWidth: "100%"}} disablePadding>
          {(menuElements.concat(buttonElements)).map(mkListItem)}
        </List>
      }
      {open && 
         <List style={{maxWidth: "100%"}} disablePadding>
        {buttonElements.map(mkAccordionItem)}
        </List>
      }
  </StyledDrawer>
};

export default React.memo(NavDrawer);